# Supabase Auth Email Setup (Prod)

This project includes branded templates that match the current app style:

- `supabase/templates/confirm_signup.html`
- `supabase/templates/magic_link.html`
- `supabase/templates/invite.html`
- `supabase/templates/recovery.html`

Use these in Supabase Dashboard:

1. Go to `Authentication > Email Templates`.
2. Open each template and paste the corresponding HTML file:
   - Confirm signup -> `confirm_signup.html`
   - Magic Link -> `magic_link.html`
   - Invite -> `invite.html`
   - Reset Password -> `recovery.html`
3. Save changes.

## Required Auth URL settings

In `Authentication > URL Configuration`:

- `Site URL`: `https://privadareforma.com`
- Add redirect URLs:
  - `https://privadareforma.com/login`
  - `http://localhost:5173/login`

## SMTP (custom sender + deliverability)

In `Authentication > SMTP Settings` configure:

- Host
- Port
- Username
- Password
- Sender email (e.g. `no-reply@privadareforma.com`)
- Sender name (e.g. `Privada Reforma`)

After SMTP is active, send a test magic link from the login screen.

## App behavior

Login page supports:

- Email + password
- Magic link via `signInWithOtp` (`shouldCreateUser: false`)

If magic link fails:

1. Confirm SMTP credentials are valid.
2. Confirm redirect URLs include the exact `/login` path.
3. Confirm template link uses `{{ .ConfirmationURL }}`.
4. Check Auth logs in Supabase.
