/**
 * Automação de candidatura por e-mail — Gmail + Google Sheets
 *
 * COMO PREPARAR:
 * 1) Importe sua planilha de contatos para o Google Sheets.
 * 2) Mantenha a aba original com o nome "Contatos RH" e colunas A=Empresa, B=Email de RH.
 * 3) Abra Extensões > Apps Script e cole este arquivo.
 * 4) Preencha os IDs dos currículos em português e inglês na configuração.
 * 5) Execute setupOutreach() uma vez; depois revise a aba "Controle de envios".
 * 6) Execute runDailyOutreach() manualmente para o primeiro lote de teste.
 * 7) Só depois de conferir o teste, execute installDailyTrigger().
 *
 * O script envia mensagens individuais, não usa CCO, evita duplicados e registra status.
 * O follow-up é enviado na mesma conversa após 5 dias úteis, apenas se não detectar resposta.
 */

const CONFIG = {
  SOURCE_SHEET: 'Contatos RH',
  CONTROL_SHEET: 'Controle de envios',
  RESUME_PT_FILE_ID: 'SEU_ID_CURRICULO_PT',
  RESUME_EN_FILE_ID: 'SEU_ID_CURRICULO_EN',
  SENDER_EMAIL: 'seu-email@gmail.com', // Altere se sua conta Gmail for diferente.
  SENDER_NAME: 'Seu Nome',
  SENDER_PHONE: '(00) 00000-0000',
  SENDER_LOCATION: 'Sua Cidade - UF',
  LINKEDIN_URL: 'https://linkedin.com/in/seu-perfil/',
  GITHUB_URL: 'https://github.com/seu-usuario',
  PT_FILE_NAME: 'Curriculo.pdf',
  EN_FILE_NAME: 'Resume.pdf',
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
    const attachmentName = language === 'EN' ? CONFIG.EN_FILE_NAME : CONFIG.PT_FILE_NAME;
    GmailApp.sendEmail(email, subject, body, {
      attachments: [resume.getBlob().setName(attachmentName)],
      name: CONFIG.SENDER_NAME,
      replyTo: CONFIG.SENDER_EMAIL
    });

    const sentAt = new Date();
    Utilities.sleep(1200);
    const threadId = findSentThreadId_(email, subject);
    const followupAt = addBusinessDays_(sentAt, CONFIG.FOLLOWUP_BUSINESS_DAYS);
    const sheetRow = i + 2;
    sheet.getRange(sheetRow, 3, 1, 5).setValues([[
      'ENVIADO', sentAt, followupAt, threadId || '', threadId ? '' : 'Envio feito; ID da conversa não localizado. Verifique manualmente antes do follow-up.'
    ]]);
    sent++;
    Utilities.sleep(1200);
  }

  SpreadsheetApp.getActiveSpreadsheet().toast('Lote concluído: ' + sent + ' e-mails enviados.', 'Prospecção', 8);
}

function sendTestEmail() {
  validateConfig_();
  const resume = getResumeFile_('PT');
  GmailApp.sendEmail(CONFIG.SENDER_EMAIL, '[TESTE] ' + CONFIG.SUBJECT, buildFirstEmail_('Empresa de teste', 'PT'), {
    attachments: [resume.getBlob().setName(CONFIG.PT_FILE_NAME)],
    name: CONFIG.SENDER_NAME,
    replyTo: CONFIG.SENDER_EMAIL
  });
  SpreadsheetApp.getUi().alert('E-mail de teste em português enviado para ' + CONFIG.SENDER_EMAIL + '. Confira texto, assinatura e PDF antes de liberar os envios.');
}

function sendTestEmailEnglish() {
  validateConfig_();
  const resume = getResumeFile_('EN');
  GmailApp.sendEmail(CONFIG.SENDER_EMAIL, '[TEST] Professional Introduction | Data, BI, Processes & Operations', buildFirstEmail_('Test Company', 'EN'), {
    attachments: [resume.getBlob().setName(CONFIG.EN_FILE_NAME)],
    name: CONFIG.SENDER_NAME,
    replyTo: CONFIG.SENDER_EMAIL
  });
  SpreadsheetApp.getUi().alert('English test email sent to ' + CONFIG.SENDER_EMAIL + '. Review the message and attached PDF.');
}

function processFollowups_(sheet, data) {
  const now = new Date();
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const status = String(row[2] || '').trim();
    const due = row[4] instanceof Date ? row[4] : null;
    const threadId = String(row[5] || '').trim();
    const email = String(row[1] || '').trim().toLowerCase();
    const company = String(row[0] || '').trim();
    const language = normalizeLanguage_(row[7]);
    if (status !== 'ENVIADO' || !due || due > now) continue;
    const sheetRow = i + 2;
    if (!threadId) {
      sheet.getRange(sheetRow, 7).setValue('Follow-up pendente: conversa Gmail não localizada; verificar manualmente.');
      continue;
    }

    const thread = GmailApp.getThreadById(threadId);
    if (!thread) {
      sheet.getRange(sheetRow, 7).setValue('Follow-up pendente: conversa não encontrada; verificar manualmente.');
      continue;
    }

    const hasReply = thread.getMessages().some(message => {
      const from = extractEmail_(message.getFrom());
      return from === email && message.getDate() > row[3];
    });
    if (hasReply) {
      sheet.getRange(sheetRow, 3).setValue('RESPONDEU');
      sheet.getRange(sheetRow, 7).setValue('Resposta recebida; sequência automática encerrada.');
      continue;
    }

    thread.reply(buildFollowupEmail_(company, language));
    sheet.getRange(sheetRow, 3).setValue('FOLLOW-UP ENVIADO');
    sheet.getRange(sheetRow, 7).setValue('Segundo contato enviado automaticamente.');
  }
}

function installDailyTrigger() {
  if (!CONFIG.SEND_ENABLED) throw new Error('Altere SEND_ENABLED para true depois de revisar o teste antes de instalar o envio diário.');
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'runDailyOutreach') ScriptApp.deleteTrigger(trigger);
  });
  ScriptApp.newTrigger('runDailyOutreach')
    .timeBased()
    .everyDays(1)
    .atHour(CONFIG.TIME_TRIGGER_HOUR)
    .create();
  SpreadsheetApp.getUi().alert('Agendamento diário instalado. O script tentará enviar até ' + CONFIG.DAILY_LIMIT + ' novos e-mails por dia e processará follow-ups vencidos.');
}

function removeDailyTrigger() {
  ScriptApp.getProjectTriggers().forEach(trigger => {
    if (trigger.getHandlerFunction() === 'runDailyOutreach') ScriptApp.deleteTrigger(trigger);
  });
  SpreadsheetApp.getUi().alert('Agendamento diário removido.');
}

function buildFirstEmail_(company, language) {
  if (normalizeLanguage_(language) === 'EN') {
    return 'Dear ' + company + ' HR team,\n\n' +
    Your Text \n\n' +
      'Best regards,\n' + CONFIG.SENDER_NAME + '\n' +
      CONFIG.SENDER_LOCATION + '\n' +
      CONFIG.SENDER_PHONE + '\n' +
      CONFIG.SENDER_EMAIL + '\n' +
      'LinkedIn: ' + CONFIG.LINKEDIN_URL + '\n' +
      'GitHub: ' + CONFIG.GITHUB_URL + '\n\n' +
  }
  return 'Prezados(as),\n\n' +
    Seu texto\n\n' +
    \n\n' +
    \n\n' +
    CONFIG.SENDER_NAME + '\n' +
    CONFIG.SENDER_LOCATION + '\n' +
    CONFIG.SENDER_PHONE + '\n' +
    CONFIG.SENDER_EMAIL + '\n\n' +
    'LinkedIn: ' + CONFIG.LINKEDIN_URL + '\n' +
    'GitHub: ' + CONFIG.GITHUB_URL;
}

function buildFollowupEmail_(company, language) {
  if (normalizeLanguage_(language) === 'EN') {
    return 'Hello ' + company + ' HR team,\n\n' +
      'I am following up briefly to check whether my resume, sent previously, reached the appropriate team.\n\n' +
      'I remain available to discuss opportunities in Data, BI, Process Improvement, Operations, or Planning that may match my background.\n\n' +
      'Thank you again for your time.\n\nBest regards,\n' + CONFIG.SENDER_NAME + '\n' + CONFIG.SENDER_EMAIL;
  }
  return 'Olá, equipe de RH da ' + company + ', tudo bem?\n\n' +
    'Estou retomando brevemente o contato para confirmar se meu currículo, enviado anteriormente, chegou à equipe responsável.\n\n' +
    'Continuo à disposição para conversar sobre oportunidades nas áreas de Dados, BI, Processos, Operações ou Planejamento que estejam alinhadas ao meu perfil.\n\n' +
    'Agradeço novamente pela atenção.\n\nAtenciosamente,\n' + CONFIG.SENDER_NAME + '\n' + CONFIG.SENDER_EMAIL;
}

function normalizeLanguage_(value) {
  return String(value || 'PT').trim().toUpperCase() === 'EN' ? 'EN' : 'PT';
}

function getResumeFile_(language) {
  const fileId = normalizeLanguage_(language) === 'EN' ? CONFIG.RESUME_EN_FILE_ID : CONFIG.RESUME_PT_FILE_ID;
  if (!fileId) throw new Error('ID do currículo não configurado para o idioma ' + language + '.');
  const file = DriveApp.getFileById(fileId);
  if (file.getMimeType() !== MimeType.PDF) throw new Error('O arquivo de currículo selecionado não é PDF.');
  return file;
}

function findSentThreadId_(email, subject) {
  const query = 'in:sent to:' + email + ' subject:"' + subject.replace(/"/g, '') + '" newer_than:3d';
  const threads = GmailApp.search(query, 0, 5);
  return threads.length ? threads[0].getId() : '';
}

function addBusinessDays_(date, days) {
  const result = new Date(date);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const day = result.getDay();
    if (day !== 0 && day !== 6) added++;
  }
  return result;
}

function extractEmail_(from) {
  const match = String(from || '').match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match ? match[0].toLowerCase() : String(from || '').toLowerCase();
}

function isValidEmail_(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateConfig_() {
  if (!CONFIG.RESUME_PT_FILE_ID || !CONFIG.RESUME_EN_FILE_ID) {
    throw new Error('Confira os IDs dos currículos em português e inglês na configuração.');
  }
  if (!isValidEmail_(CONFIG.SENDER_EMAIL)) throw new Error('Confira SENDER_EMAIL na configuração.');
}
