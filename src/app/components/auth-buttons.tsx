"use client"

import {signIn, signOut} from "next-auth/react";

export default function SignIn() {
    return <button onClick={() => signIn()}>Sign in</button>
}

export function SignOut() {
    return <button onClick={() => signOut()}>Sign out</button>
}