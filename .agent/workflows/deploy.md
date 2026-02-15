---
description: How to deploy and update the site on Firebase
---

# Deployment Workflow

Follow these steps to deploy your site to Firebase Hosting and Firestore.

## 1. Prerequisites
Ensure you have the Firebase CLI installed:
```bash
npm install -g firebase-tools
```

## 2. Login to Firebase
Run the following command and follow the browser prompts to log in:
```bash
npx firebase login
```

## 3. Build the Application
// turbo
Before deploying, you must build the production-ready assets:
```bash
npm run build
```

## 4. Deploy to Firebase
// turbo
Deploy both the web app (Hosting) and the database protection rules (Firestore):
```bash
npx firebase deploy
```

---

# How to Update the Site

Whenever you make changes to the code, follows these steps to push updates live:

1. **Build again**: `npm run build`
2. **Deploy again**: `npx firebase deploy`

> [!TIP]
> You can combine these into a single command:
> `npm run build && npx firebase deploy`

---

# Automatic Deployment (Optional)
To set up automatic deployment every time you push to GitHub:
1. Run `firebase init hosting:github`
2. Follow the prompts to authorize GitHub and select your repository.
3. This will create a GitHub Action that automatically builds and deploys your site whenever you merge into the main branch.
