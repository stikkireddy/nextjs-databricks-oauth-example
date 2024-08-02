# NextJS with Databricks User OAuth

## Getting Started

Configure the .env.local file with the appropriate values.

First install the dependencies:

```bash
npm install
# or
yarn install
# or
pnpm install
# or
bun install
```
Second, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

## Description

This is a simple NextJS App that uses a App Router and Next-Auth to configure custom OAuth for Databricks.
You can manually setup the callbacks and routing but next-auth makes that and session management via cookies very easy.
This is designed for workspaces and not the account console oauth.

## Major Dependencies

- NextJS ([Home Page](https://nextjs.org/))
- Next-Auth ([Home Page](https://next-auth.js.org/))

## Databricks OAuth Custom Client

1. Go to databricks account console
2. Go to Settings -> App Connections
3. Create a new app connection
4. Make sure you have the following scopes selected `all apis`
5. Make sure you use the following redirect uri: `http://localhost:5173/token` or the appropriate one if you customize
6. We will be using authorization code grant flow with a client secret and PKCE with challenge method S256 (Sha256).
7. Make sure you select **generate client secret** since we have CORS requirement and you will need backend and client secret is good to have since the client is confidential.

## Required Environment Variables

1. NEXTAUTH_SECRET - This is a secret key that is used to encrypt the cookies
2. NEXTAUTH_URL - This is the URL of the NextJS app; next auth uses this to generate the callback url for redirects
3. AUTHORIZATION_URL=https://<workspace-host>/oidc/v1/authorize - This is the authorization url for the Databricks workspace
4. TOKEN_URL=https://<workspace-host>/oidc/v1/token - This is the token url for the Databricks workspace
5. USER_INFO_SCIM_ME_URL=https://<workspace-host>/api/2.0/preview/scim/v2/Me - This is the user info url for the Databricks workspace
6. CLIENT_ID - This is the client id of the Databricks app
7. CLIENT_SECRET - This is the client secret of the Databricks app

## Auth workflow

1. User Clicks Login
2. The next-auth route handler will prepare the code challenge, state and code verifier and ship the authorization url
3. The next-auth route handler will store this information in the server session to keep track of the state and code verifier
4. The UI will redirect to the authorization url (this is a Databricks url)
5. The user will authenticate and authorize the app
6. Databricks will redirect to the redirect_uri with the code and state and this will be the url pointing to backend
7. The next-auth route handler will receive the code and state with something like this /token?code=XXX&state=YYY
8. The next-auth route handler will then retrieve the code verifier, state from the HTTPOnly cookie and validate the state
9. If the state is valid, the backend will exchange the code for the token using the client_id, client_secret, code, code_verifier
10. The next-auth route handler will save the token, refresh token, etc encrypted in a HTTPOnly secure cookie (next-auth.session) and redirect to the React application path.

**All cookies in the explanation are managed by the Next-Auth session management. All the cookies are encrypted by the NEXTAUTH_SECRET.**

During session refresh the token will be refreshed if possible. The tokens will be refreshed when the access token expires.

## How to run

1. Clone the repo
2. Make sure you have nodejs and npm installed
3. Populate all the .env files
4. Run `pnpm install` to install the dependencies for both the python project and the react app
5. Run `pnpm run dev` to start the app

## TODO Items

1. Deployment instructions for vercel or sst