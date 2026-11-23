🌐 **Language / Idioma:** **English** | [🇧🇷 Português](#português)

---

# 📧 Automated Job Outreach & Follow-up (Google Sheets + Gmail)

Automated system built with **Google Apps Script** to manage and send individual job applications and follow-ups directly through the Google Workspace ecosystem (Google Sheets, Gmail, and Google Drive).

This project applies **process governance, data hygiene, and smart cadence** principles, avoiding mass blasts (no BCC) while keeping full traceability of every interaction.

---

## 🎯 Key Features

- **Data Ingestion & Hygiene:** Reads the source tab, validates email formats via Regex, and automatically removes duplicate contacts before building the outreach queue.
- **Tracking & Audit Log:** Creates a dedicated tab (`Controle de envios`) that logs statuses (`PENDENTE`, `ENVIADO`, `FOLLOW-UP ENVIADO`, `RESPONDEU`), timestamps, and the Gmail `threadId`.
- **Dynamic Bilingual Support (PT / EN):** Adapts the subject line and email body, and automatically attaches the matching PDF file (Portuguese resume or English resume) stored in Google Drive.
- **Cadence & Anti-Spam Guardrails:**
  - Individual 1-to-1 sending with safety delays (`Utilities.sleep`).
  - Configurable daily sending cap (`DAILY_LIMIT`).
  - Automatic weekend send blocker.
- **Thread-Based Smart Follow-up:** After *N* business days (default: 5 days), the script checks the specific Gmail conversation history. If a reply from the recipient is detected, it stops the sequence; otherwise, it sends a follow-up in the same thread.
- **Safety Lock & Test Functions:** Includes a master switch (`SEND_ENABLED`) and dedicated PT/EN test email functions before enabling daily triggers.

---

## 🛠️ Tech Stack

- **Google Apps Script** (JavaScript ES6+)
- **Google Sheets API** (Spreadsheet manipulation, status tracking, and UI alerts)
- **Gmail API** (`GmailApp` for sending emails, attachments, thread lookup, and reply detection)
- **Google Drive API** (`DriveApp` for reading and validating PDF files)

---

## 📋 Spreadsheet Structure

1. **Source Tab (`Contatos RH`):**
   - **Column A:** Company Name
   - **Column B:** Contact / HR Email

2. **Tracking Tab (`Controle de envios` — auto-generated):**
   - `Empresa` | `Email de RH` | `Status` | `Data do primeiro envio` | `Data do follow-up` | `ID da conversa Gmail` | `Observação` | `Idioma (PT/EN)`

---

## 🚀 Setup & Usage

### 1. Preparation
1. Create a Google Sheets spreadsheet and rename the first tab to **`Contatos RH`**, filling in Column `A` (Company) and Column `B` (Email).
2. Save your resumes as **PDF** files in Google Drive and copy each file's **ID** from its sharing URL.
3. In Google Sheets, go to **Extensions > Apps Script** and paste the contents of `Code.gs` from this repository.

### 2. Configuration
Update the `CONFIG` object at the top of `Code.gs` with your own details:

```javascript
const CONFIG = {
  SOURCE_SHEET: 'Contatos RH',
  CONTROL_SHEET: 'Controle de envios',
  RESUME_PT_FILE_ID: 'YOUR_PT_RESUME_DRIVE_FILE_ID',
  RESUME_EN_FILE_ID: 'YOUR_EN_RESUME_DRIVE_FILE_ID',
  SENDER_EMAIL: 'your-email@gmail.com',
  SENDER_NAME: 'Your Full Name',
  SENDER_PHONE: '(00) 00000-0000',
  SENDER_LOCATION_PT: 'Your City – ST',
  SENDER_LOCATION_EN: 'Your City, Brazil',
  LINKEDIN_URL: '[https://linkedin.com/in/your-profile/](https://linkedin.com/in/your-profile/)',
  GITHUB_URL: '[https://github.com/your-username](https://github.com/your-username)',
  DAILY_LIMIT: 15,
  SEND_ENABLED: false, // Set to true only after testing
  SUBJECT: 'Apresentação profissional | Dados, BI, Processos e Operações',
  FOLLOWUP_BUSINESS_DAYS: 5,
  TIME_TRIGGER_HOUR: 9
};
