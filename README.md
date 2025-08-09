SolMeme Upgrade — Private Passkey-Protected Dashboard (ready to deploy)

Files:
- index.html
- styles.css
- config.js (set passkey and settings)
- passkey.js (client-side passkey prompt & cookie)
- app.js (dashboard + strategy + trade log)
- assets/playbook.pdf (embedded playbook)
- assets/alert.mp3 (replace with a beep if desired)
- .github/workflows/deploy.yml (auto deploy to GitHub Pages)

Passkey: tothemoon (set in config.js)
Deploy (drag-and-drop):
1. Create GitHub repo 'solmeme-dashboard' under your account.
2. Upload all files from this package into repo root.
3. Commit and wait ~1-2 minutes for Pages to publish.
4. Visit https://YOUR_USERNAME.github.io/solmeme-dashboard/ and enter passkey.
