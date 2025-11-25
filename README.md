
# Mini RCM Validation Engine

A production-oriented prototype for a Mini Revenue Cycle Management (RCM) Validation Engine. This system handles claim ingestion, validation against rules, adjudication, and result presentation.

---

## 🚀 Project Overview

This project ingests healthcare claim data, validates each claim using rule documents, stores adjudication outcomes, and exposes front-end views for users to upload claims and review validation results.

The architecture includes:

* **Front-end (Next.js under /app)**: UI pages, upload, admin health check endpoint
* **Back-end (Firebase Only)**:

  * Firestore (Master claims table)
  * Firebase Functions (All validation logic, ingestion, processing)
  * Firebase Auth
* **Admin Endpoint (Next.js)**: Only used for health check

---

## 📁 Project Structure

```
project-root/
│── app/                     # Next.js frontend
│   ├── (auth, upload, results pages)
│   └── ...
│── functions/               # Firebase backend logic only
│   ├── index.js (exports Cloud Functions)
│   ├── validators/ (all claim validation logic)
│   ├── rules/ (rule docs, if any)
│   └── utils/
│── public/
└── README.md
```

---

## 🧠 Core Features

* **Claim Upload & Parsing**: Accepts CSV/XLSX or JSON claim formats.
* **Validation Engine**:

  * Runs rules based on condition types, codes, and claims structure.
  * Returns errors, warnings, or approval statuses.
* **API Endpoints**:

  * `/api/admin` – Health check
  
* **Firestore Storage**:

  * Stores claims, errors, and rule outcomes
* **Dashboard UI** (Next.js):

  * Table view of claims
  * Charts summarizing validation performance
  * Error drill-down

---

## 🔥 Deployment

This project uses **Firebase Cloud Functions** and **Firebase Hosting**.

### 1. Install Firebase Tools

```bash
npm install -g firebase-tools
```

### 2. Login

```bash
firebase login
```

### 3. Deploy Functions

```bash
cd backend/functions
firebase deploy --only functions
```

### 4. Deploy Frontend

```bash
cd frontend
npm run build
firebase deploy --only hosting
```

---

## 🧪 Testing Cloud Functions

Once deployed, Cloud Functions URLs look like:

```
https://us-central1-<PROJECT-ID>.cloudfunctions.net/<FUNCTION-NAME>
```

### Example

To manually trigger validation for a claim:

```bash
curl "https://us-central1-mini-rcm-validation-engine.cloudfunctions.net/testProcessClaim?claimId=YOUR_ID_HERE"
```

If you get **404**, ensure:

* The function is exported correctly from `index.js`
* You deployed using `firebase deploy --only functions`
* The Firebase region is `us-central1`
* Function name is correct

---

## 📦 Environment Variables / Config

Use Firebase config:

```bash
firebase functions:config:set rcm.project="mini-rcm-validation-engine"
```

Retrieve with:

```js
functions.config().rcm.project
```

---

## 📊 Frontend Features

* Secure login (email/password or provider)
* CSV upload
* Validation results
* Graphical reports (Pie, Bar charts)

---

## 📜 Example Claim Format

```
ClaimID, Date, PatientID, PayerID, PolicyID, Codes, Status
01/13/25, SYWX6RYN, B1G36XGM, OCQUMGDW, E66.3;R07.9, Obtain approval
```

---

## 🛠️ Local Development

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Functions

```bash
cd backend/functions
npm install
firebase emulators:start
```

---

## ❗ Troubleshooting

### 404 on Cloud Function URL

Checklist:

* Is the function name correct?
* Did `firebase deploy` finish successfully?
* Check logs:

```bash
firebase functions:log
```

### Missing Claim Data

* Verify Firestore rules
* Ensure collection paths match between code and dashboard

---

## 📧 Contact / Maintainer

If you have questions or need improvements, feel free to reach out.

---

**Enjoy building your Mini RCM Validation Engine!** 🚀
