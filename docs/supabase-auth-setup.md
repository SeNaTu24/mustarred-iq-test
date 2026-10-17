# Supabase authentication URL setup

The app sends registration and password-recovery emails to an explicit
`NEXT_PUBLIC_SITE_URL` callback. Set this variable to the origin candidates can
open; the app never derives email links from the browser's current host.

## Local development

For a browser on the same computer as the development server, set:

```text
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

In Supabase **Authentication → URL Configuration**, set **Site URL** to
`http://localhost:3000` and add
`http://localhost:3000/auth/callback` to **Redirect URLs**. Restart the Next.js
server after changing the local environment file.

`localhost` always means the device opening the email. It works when the email
link is opened in a browser on the same computer running Next.js; it cannot
reach that computer from a phone or another device. For those tests, expose the
local server through a trusted HTTPS tunnel and use that tunnel's origin as
`NEXT_PUBLIC_SITE_URL`, **Site URL**, and an allowed callback URL for the
duration of the test. Do not send candidate links that point to `localhost`.

## Public deployment

Set `NEXT_PUBLIC_SITE_URL` to the deployed HTTPS app origin and set Supabase
**Site URL** to the same origin. Add the exact
`https://your-real-domain.example/auth/callback` URL to **Redirect URLs**,
substituting the domain actually assigned to the deployment. Do not use the
placeholder domain shown here as a real setting. Rebuild/redeploy after
changing the environment variable.

The app's registration and recovery calls explicitly redirect to
`/auth/callback` on this origin. The Supabase confirmation and recovery email
templates must preserve the Supabase-generated confirmation URL (normally
`{{ .ConfirmationURL }}`); do not replace it with a hard-coded localhost URL.
The callback exchanges the verification/recovery response, then routes a
recovery session to `/auth/update-password`.

## Existing users and sign-in

Email/password sign-in is sent to the Supabase project selected by
`NEXT_PUBLIC_SUPABASE_URL`. The app trims surrounding whitespace from the
email and sends the password unchanged. Email-link redirect settings do not
change password-grant credentials. An `invalid_credentials` response therefore
still needs to be resolved against the intended Supabase project and account;
this configuration change does not establish or repair an individual
credential.
