/**
 * Automação de candidatura por e-mail — Gmail + Google Sheets
 *
 * COMO PREPARAR:
 * 1) Crie uma planilha no Google Sheets e renomeie a primeira aba para "Contatos RH".
 * 2) Preencha as colunas: A = Empresa, B = Email de RH.
 * 3) Abra Extensões > Apps Script e cole este arquivo.
 * 4) Preencha os IDs dos currículos em português e inglês e seus dados no objeto CONFIG.
 * 5) Execute setupOutreach() uma vez; depois revise a aba "Controle de envios".
 * 6) Execute sendTestEmail() / sendTestEmailEnglish() para validar o visual e os anexos.
 * 7) Altere SEND_ENABLED para true e execute installDailyTrigger().
 *
 * O script envia mensagens individuais, não usa CCO, evita duplicados e registra status.
 * O follow-up é enviado na mesma conversa após N dias úteis, apenas se não detectar resposta.
 */

const CONFIG = {
  SOURCE_SHEET: 'Contatos RH',
  CONTROL_SHEET: 'Controle de envios',
  RESUME_PT_FILE_ID: 'SEU_ID_DO_CURRICULO_PT_NO_DRIVE',
  RESUME_EN_FILE_ID: 'SEU_ID_DO_CURRICULO_EN_NO_DRIVE',
  SENDER_EMAIL: 'seu-email@gmail.com',
  SENDER_NAME: 'Seu Nome Completo',
  SENDER_PHONE: '(00) 00000-0000',
  SENDER_LOCATION_PT: 'Sua Cidade – UF',
  SENDER_LOCATION_EN: 'Your City, Brazil',
  LINKEDIN_URL: 'https://linkedin.com/in/seu-usuario/',
  GITHUB_URL: 'https://github.com/seu-usuario',
  DAILY_LIMIT: 15,
  SEND_ENABLED: false, // Mude para true somente depois de testar e revisar a lista.
  SUBJECT: 'Apresentação profissional | Dados, BI, Processos e Operações',
  FOLLOWUP_BUSINESS_DAYS: 5,
  TIME_TRIGGER_HOUR: 9
};

const HEADERS = [
  'Empresa', 'Email de RH', 'Status', 'Data do primeiro envio',
  'Data do follow-up', 'ID da conversa Gmail', 'Observação', 'Idioma (PT/EN)'
];

function setupOutreach() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const source = ss.getSheetByName(CONFIG.SOURCE_SHEET);
  if (!source) throw new Error('Não encontrei a aba "' + CONFIG.SOURCE_SHEET + '". Confira o nome da aba importada.');

  let control = ss.getSheetByName(CONFIG.CONTROL_SHEET);
  if (control && control.getLastRow() > 1) {
    throw new Error('A aba de controle já contém dados. Não execute setupOutreach() novamente para não apagar o histórico de envios.');
  }
  if (!control) control = ss.insertSheet(CONFIG.CONTROL_SHEET);
  control.clearContents();
  control.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  control.setFrozenRows(1);

  const values = source.getDataRange().getValues();
  const seen = new Set();
  const rows = [];
  for (let i = 1; i < values.length; i++) {
    const company = String(values[i][0] || '').trim();
    const email = String(values[i][1] || '').trim().toLowerCase();
    if (!company || !isValidEmail_(email) || seen.has(email)) continue;
    seen.add(email);
    rows.push([company, email, 'PENDENTE', '', '', '', '', 'PT']);
  }
  if (rows.length) control.getRange(2, 1, rows.length, HEADERS.length).setValues(rows);
  control.autoResizeColumns(1, HEADERS.length);
  SpreadsheetApp.getUi().alert('Controle criado com ' + rows.length + ' contatos únicos. Revise a lista antes de enviar.');
}

function runDailyOutreach() {
  validateConfig_();
  if (!CONFIG.SEND_ENABLED) throw new Error('Envios em lote estão bloqueados. Teste primeiro e altere SEND_ENABLED para true.');
  const today = new Date().getDay();
  if (today === 0 || today === 6) {
    SpreadsheetApp.getActiveSpreadsheet().toast('Fim de semana: nenhum e-mail enviado hoje.', 'Prospecção', 5);
    return;
  }
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.CONTROL_SHEET);
  if (!sheet || sheet.getLastRow() < 2) throw new Error('Execute setupOutreach() primeiro.');

  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, HEADERS.length).getValues();

  processFollowups_(sheet, data);

  let sent = 0;
  for (let i = 0; i < data.length && sent < CONFIG.DAILY_LIMIT; i++) {
    const row = data[i];
    const company = String(row[0] || '').trim();
    const email = String(row[1] || '').trim().toLowerCase();
    const status = String(row[2] || '').trim();
    const language = normalizeLanguage_(row[7]);
    if (status !== 'PENDENTE' || !isValidEmail_(email)) continue;

    const resume = getResumeFile_(language);
    const body = buildFirstEmail_(company, language);
    const subject = language === 'EN' ? 'Professional Introduction | Data, BI, Processes & Operations' : CONFIG.SUBJECT;
    GmailApp.sendEmail(email, subject, body, {
      attachments: [resume.getBlob().setName(language === 'EN' ? 'Resume
