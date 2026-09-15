Deploying this folder on cPanel (Setup Node.js App):

1. Upload this whole `api/` folder to the server (SSH: scp/rsync, or
   git push to a repo the server pulls from).
2. In cPanel > Setup Node.js App, create/edit the app:
     - Application root: point at this folder
     - Application startup file: dist/main.js
     - Node version: 20.x (or whatever this project targets)
3. Set every environment variable from your local apps/api/.env in the
   cPanel Node app's "Environment variables" section (DATABASE_URL,
   JWT secrets, FLUTTERWAVE_*, RESEND_API_KEY, etc.) — do NOT upload
   the .env file itself.
4. SSH into the app's virtual env and run:
     npm install --omit=dev
5. Restart the app from the cPanel Node.js App screen.

Re-run scripts/build-cpanel.sh and re-upload every time you deploy a
change — this is not a live copy of the repo.
