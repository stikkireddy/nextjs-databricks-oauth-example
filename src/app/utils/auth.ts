import {GetServerSidePropsContext, NextApiRequest, NextApiResponse} from "next";
import {Awaitable, getServerSession, NextAuthOptions, Profile, Session, TokenSet, User} from "next-auth";
import {JWT} from "next-auth/jwt";

export default function auth(
    ...args:
        | [GetServerSidePropsContext["req"], GetServerSidePropsContext["res"]]
        | [NextApiRequest, NextApiResponse]
        | []
) {
    return getServerSession(...args, authOptions)
}

export const parseJwt = (token: string) => {
    if (!token) {
        return;
    }
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace('-', '+').replace('_', '/');
    return JSON.parse(atob(base64));
}

type CurrentUser = {
    id: string,
    userName: string
    email: string,
}

const getCurrentUser = async (token: string) => {
    const response = await fetch(process.env.USER_INFO_SCIM_ME_URL!, {
        headers: {
            Authorization: `Bearer ${token}`
        },
        method: "GET"
    })
    if (!response.ok) {
        throw new Error("Invalid token or user")
    }
    const data = await response.json()
    return {
        id: data.id,
        userName: data.userName,
        email: data.userName
    } as CurrentUser
}

/**
 * Takes a token, and returns a new token with updated
 * `accessToken` and `accessTokenExpires`. If an error occurs,
 * returns the old token and an error property
 */
async function refreshAccessToken(token: JWT) {
    try {
        const url = process.env.TOKEN_URL!

        const formData = new URLSearchParams({
            client_id: process.env.CLIENT_ID!,
            client_secret: process.env.CLIENT_SECRET!,
            grant_type: "refresh_token",
            refresh_token: token.refreshToken as string,
        })

        const response = await fetch(url, {
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            method: "POST",
            body: formData.toString()
        })

        const refreshedTokens = await response.json()

        if (!response.ok) {
            throw refreshedTokens
        }

        return {
            ...token,
            accessToken: refreshedTokens.access_token,
            accessTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
            refreshToken: refreshedTokens.refresh_token ?? token.refreshToken, // Fall back to old refresh token
        }
    } catch (error) {
        console.log(error)

        return {
            ...token,
            error: "RefreshAccessTokenError",
        }
    }
}

export const authOptions = {
    secret: process.env.NEXTAUTH_SECRET,
    callbacks: {
        async jwt({ token, account, user }) {
            // Persist the OAuth access_token to the token right after signin
            console.log("Retrieving token...")
            if (account && user) {
                return {
                    accessToken: account.accessToken,
                    accessTokenExpires: account.expires_at! * 1000,
                    refreshToken: account.refresh_token,
                    user,
                }
            }

            // Return previous token if the access token has not expired yet
            if (Date.now() < (token.accessTokenExpires as number)) {
                console.log("Token has not expired yet")
                return token
            }

            // Access token has expired, try to update it
            return refreshAccessToken(token)
        },

        async session({ session, token }: { session: Session, token: JWT }
        ) {
            // Send properties to the client, like an access_token from a provider.
            console.log("retrieving session...")
            if (token) {
                session.user = token.user as User
                // @ts-ignore
                session.accessToken = token.accessToken
                // @ts-ignore
                session.error = token.error
            }

            return session
        }
    },
    providers: [
        {
            id: "databricks",
            name: "Databricks",
            type: "oauth",
            version: "2.0",
            authorization: {
                url: process.env.AUTHORIZATION_URL,
                params: {grant_type: "authorization_code", scope: "all-apis offline_access",}
            },
            token: {
                url: process.env.TOKEN_URL,
            },
            clientId: process.env.CLIENT_ID,
            clientSecret: process.env.CLIENT_SECRET,
            checks: ["pkce", "state"],
            userinfo: {
                request: async (params: { tokens: TokenSet }) => {
                    try {
                        const currUser = await getCurrentUser(params.tokens.access_token!)
                        return {
                            sub: currUser.id,
                            email: currUser.email,
                            name: currUser.userName,
                        } as Profile
                    } catch (error) {
                        return {}
                    }
                }
            },
            profile(profile: Profile, tokens: TokenSet): Awaitable<User> {
                // accounts api does not have scim so we can extract from jwt and rely on that instead
                if (profile !== undefined && profile.sub !== undefined) {
                    return {
                        id: profile.sub,
                        email: profile.email,
                        name: profile.name,
                    }
                }
                if (tokens.access_token === undefined) {
                    throw new Error("invalid token")
                }
                const decodedJwt = parseJwt(tokens.access_token)
                return {
                    id: decodedJwt.sub,
                    email: decodedJwt.sub,
                    name: decodedJwt.sub,
                    image: null,
                }
            },
        },
    ]
} satisfies NextAuthOptions