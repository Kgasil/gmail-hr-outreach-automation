# Automação de Candidatura Ativa & Follow-up (Google Sheets + Gmail)

> 🌐 **Idioma / Language:** [Português](#versao-em-portugues) | [English](#english-version)

---

<a name="versao-em-portugues"></a>
## 🇧🇷 Versão em Português

Sistema automatizado desenvolvido em **Google Apps Script** para gerenciar e executar envios individuais de currículos e acompanhamentos (follow-ups) diretamente pelo ecossistema Google Workspace (Sheets, Gmail e Drive).

O projeto aplica conceitos de **governança de processos, higienização de dados e cadência inteligente**, evitando disparos em massa (sem CCO) e mantendo rastreabilidade total de cada interação.

### Funcionalidades Principais

- **Ingestão e Higienização de Dados:** Lê a aba de origem, valida o formato dos e-mails via Regex e remove contatos duplicados automaticamente antes de gerar a fila de envio.
- **Controle e Auditoria:** Cria uma aba dedicada (`Controle de envios`) que registra status (`PENDENTE`, `ENVIADO`, `FOLLOW-UP ENVIADO`, `RESPONDEU`), datas e o `threadId` da conversa no Gmail.
- **Suporte Bilíngue Dinâmico (PT / EN):** Adapta o assunto, o corpo do e-mail e seleciona automaticamente o arquivo PDF correspondente (Currículo em Português ou Resume em Inglês) hospedado no Google Drive.
- **Cadência e Proteção Anti-Spam:**
  - Envio individual (1 a 1) com intervalo de segurança (`Utilities.sleep`).
  - Limite diário configurável (`DAILY_LIMIT`).
  - Bloqueio automático de disparos aos finais de semana.
- **Follow-up Inteligente Baseado em Thread:** Após *N* dias úteis (padrão: 5 dias), o script consulta o histórico daquela conversa específica no Gmail. Se detectar resposta do destinatário, encerra o fluxo; caso contrário, envia um follow-up na mesma thread.
- **Modo de Segurança e Testes:** Inclui trava de envio (`SEND_ENABLED`) e funções dedicadas para disparo de teste em PT e EN antes de ativar o gatilho diário.

### Tecnologias Utilizadas

- **Google Apps Script** (JavaScript ES6+)
- **Google Sheets API** (Manipulação de planilhas, regras de status e UI alerts)
- **Gmail API** (`GmailApp` para envios, anexos, busca de threads e detecção de respostas)
- **Google Drive API** (`DriveApp` para leitura e validação de arquivos PDF)

### Estrutura da Planilha

1. **Aba `Contatos RH` (Origem):**
   - **Coluna A:** Nome da Empresa
   - **Coluna B:** E-mail de contato

2. **Aba `Controle de envios` (Gerada automaticamente):**
   - `Empresa` | `Email de RH` | `Status` | `Data do primeiro envio` | `Data do follow-up` | `ID da conversa Gmail` | `Observação` | `Idioma (PT/EN)`

### Como Configurar e Usar

#### 1. Preparação
1. Crie uma planilha no Google Sheets e renomeie a primeira aba para **`Contatos RH`**, preenchendo as colunas `A` (Empresa) e `B` (E-mail).
2. Salve seus currículos em formato **PDF** no Google Drive e copie o **ID de cada arquivo** (presente na URL de compartilhamento).
3. Na planilha, acesse **Extensões > Apps Script** e cole o código do arquivo `Code.gs` deste repositório.

#### 2. Configuração de Variáveis
No objeto `CONFIG` no início do script, preencha seus dados:

```javascript
const CONFIG = {
  SOURCE_SHEET: 'Contatos RH',
  CONTROL_SHEET: 'Controle de envios',
  RESUME_PT_FILE_ID: 'SEU_ID_CURRICULO_PT',
  RESUME_EN_FILE_ID: 'SEU_ID_CURRICULO_EN',
  SENDER_EMAIL: 'seu-email@gmail.com',
  SENDER_NAME: 'Seu Nome',
  DAILY_LIMIT: 15,
  SEND_ENABLED: false,
  SUBJECT: 'Apresentação profissional | Dados, BI, Processos e Operações',
  FOLLOWUP_BUSINESS_DAYS: 5,
  TIME_TRIGGER_HOUR: 9
};
```

---

<a name="english-version"></a>
## 🇺🇸 English Version

Automated system built with **Google Apps Script** to manage and execute individualized resume outreach and follow-ups directly within the Google Workspace ecosystem (Sheets, Gmail, and Drive).

This project applies principles of **process governance, data sanitization, and smart cadence**, avoiding mass BCC blasts while maintaining full traceability for every interaction.

### Key Features

- **Data Ingestion & Sanitization:** Reads the source tab, validates email syntax via Regex, and automatically deduplicates contacts before building the sending queue.
- **Tracking & Audit Log:** Creates a dedicated tab (`Controle de envios`) to log status (`PENDENTE`, `ENVIADO`, `FOLLOW-UP ENVIADO`, `RESPONDEU`), timestamps, and the Gmail `threadId`.
- **Dynamic Bilingual Support (PT / EN):** Adapts the subject line and email body, and automatically attaches the corresponding PDF file (Portuguese CV or English Resume) stored in Google Drive.
- **Cadence & Anti-Spam Protection:**
  - Individualized 1-to-1 sending with safety delays (`Utilities.sleep`).
  - Configurable daily cap (`DAILY_LIMIT`).
  - Automatic weekend execution block.
- **Thread-Aware Smart Follow-up:** After *N* business days (default: 5 days), the script inspects the specific Gmail thread history. If a reply from the recipient is detected, the workflow closes; otherwise, it sends a follow-up in the same thread.
- **Safety Lock & Testing Mode:** Features a dry-run toggle (`SEND_ENABLED`) and dedicated test functions for PT and EN emails before enabling the daily trigger.

### Tech Stack

- **Google Apps Script** (JavaScript ES6+)
- **Google Sheets API** (Spreadsheet manipulation, status rules, and UI alerts)
- **Gmail API** (`GmailApp` for sending emails, attachments, thread lookups, and reply detection)
- **Google Drive API** (`DriveApp` for reading and validating PDF files)

### Spreadsheet Structure

1. **`Contatos RH` Tab (Source):**
   - **Column A:** Company Name
   - **Column B:** Contact Email

2. **`Controle de envios` Tab (Auto-generated):**
   - `Empresa` | `Email de RH` | `Status` | `Data do primeiro envio` | `Data do follow-up` | `ID da conversa Gmail` | `Observação` | `Idioma (PT/EN)`

### Setup & Usage

#### 1. Preparation
1. Create a Google Sheet and rename the first tab to **`Contatos RH`**, filling in columns `A` (Company) and `B` (Email).
2. Upload your **PDF** resumes to Google Drive and copy each **file ID** (found in the sharing URL).
3. In the spreadsheet, go to **Extensions > Apps Script** and paste the code from `Code.gs` in this repository.

#### 2. Configuration
In the `CONFIG` object at the top of the script, fill in your details:

```javascript
const CONFIG = {
  SOURCE_SHEET: 'Contatos RH',
  CONTROL_SHEET: 'Controle de envios',
  RESUME_PT_FILE_ID: 'YOUR_PT_RESUME_FILE_ID',
  RESUME_EN_FILE_ID: 'YOUR_EN_RESUME_FILE_ID',
  SENDER_EMAIL: 'your-email@gmail.com',
  SENDER_NAME: 'Your Name',
  DAILY_LIMIT: 15,
  SEND_ENABLED: false, // Keep false until tests are validated
  SUBJECT: 'Professional Introduction | Data, BI, Processes & Operations',
  FOLLOWUP_BUSINESS_DAYS: 5,
  TIME_TRIGGER_HOUR: 9
};
