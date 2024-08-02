"use server"

import SignIn, {SignOut} from "@/app/components/auth-buttons";
import auth from "@/app/utils/auth";


async function Login() {
    const session = await auth()
    if (session) {
        return (
            <>
                Signed in as {session?.user?.email}<br/>
                <SignOut/>
            </>
        )
    }
    return (
        <>
            Not signed in <br/>
            <SignIn/>
        </>
    )
}

export default async function Home() {
    return <Login/>
}
