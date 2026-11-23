# Automação de Candidatura Ativa & Follow-up (Google Sheets + Gmail)

> 🌐 **Idioma / Language:** **Português** | [English](https://github.com/Kgasil/Active-Job-Application-Follow-up-Automation/blob/main/README.md)

---

Sistema automatizado desenvolvido em **Google Apps Script** para gerenciar e executar envios individuais de currículos e acompanhamentos (follow-ups) diretamente pelo ecossistema Google Workspace (Sheets, Gmail e Drive).

O projeto aplica conceitos de **governança de processos, higienização de dados e cadência inteligente**, evitando disparos em massa (sem CCO) e mantendo rastreabilidade total de cada interação.

## Funcionalidades Principais

- **Ingestão e Higienização de Dados:** Lê a aba de origem, valida o formato dos e-mails via Regex e remove contatos duplicados automaticamente antes de gerar a fila de envio.
- **Controle e Auditoria:** Cria uma aba dedicada (`Controle de envios`) que registra status (`PENDENTE`, `ENVIADO`, `FOLLOW-UP ENVIADO`, `RESPONDEU`), datas e o `threadId` da conversa no Gmail.
- **Suporte Bilíngue Dinâmico (PT / EN):** Adapta o assunto, o corpo do e-mail e seleciona automaticamente o arquivo PDF correspondente (Currículo em Português ou Resume em Inglês) hospedado no Google Drive.
- **Cadência e Proteção Anti-Spam:**
  - Envio individual (1 a 1) com intervalo de segurança (`Utilities.sleep`).
  - Limite diário configurável (`DAILY_LIMIT`).
  - Bloqueio automático de disparos aos finais de semana.
- **Follow-up Inteligente Baseado em Thread:** Após *N* dias úteis (padrão: 5 dias), o script consulta o histórico daquela conversa específica no Gmail. Se detectar resposta do destinatário, encerra o fluxo; caso contrário, envia um follow-up na mesma thread.
- **Modo de Segurança e Testes:** Inclui trava de envio (`SEND_ENABLED`) e funções dedicadas para disparo de teste antes de ativar o gatilho diário.

## Tecnologias Utilizadas

- **Google Apps Script** (JavaScript ES6+)
- **Google Sheets API** (Manipulação de planilhas, regras de status e UI alerts)
- **Gmail API** (`GmailApp` para envios, anexos, busca de threads e detecção de respostas)
- **Google Drive API** (`DriveApp` para leitura e validação de arquivos PDF)

## Estrutura da Planilha

1. **Aba `Contatos RH` (Origem):**
   - **Coluna A:** Nome da Empresa
   - **Coluna B:** E-mail de contato

2. **Aba `Controle de envios` (Gerada automaticamente):**
   - `Empresa` | `Email de RH` | `Status` | `Data do primeiro envio` | `Data do follow-up` | `ID da conversa Gmail` | `Observação` | `Idioma (PT/EN)`

## Como Configurar e Usar

### 1. Preparação
1. Crie uma planilha no Google Sheets e renomeie a primeira aba para **`Contatos RH`**, preenchendo as colunas `A` (Empresa) e `B` (E-mail).
2. Salve seus currículos em formato **PDF** no Google Drive e copie o **ID de cada arquivo** (presente na URL de compartilhamento).
3. Na planilha, acesse **Extensões > Apps Script** e cole o código do arquivo `Code.gs` deste repositório.

### 2. Configuração de Variáveis
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
