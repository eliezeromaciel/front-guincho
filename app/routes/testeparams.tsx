import type { Route } from "./+types/testeparams"


export default function teste ({
  loaderData,
  actionData,
  params,
  matches,
}: Route.ComponentProps) {
    return (

        <div>
            teste de parametros
            <p>Loader Data: {JSON.stringify(loaderData)}</p>
            <p>Action Data: {JSON.stringify(actionData)}</p>
            <p>Route Parameters: {JSON.stringify(params)}</p>
            <p>Matched Routes: {JSON.stringify(matches)}</p>
        </div>
    )
}