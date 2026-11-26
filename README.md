# Portal do Colaborador

Site para celular em que cada colaborador entra com **CPF e senha** e **só consulta** a própria folha de ponto, os holerites, os avisos e os dados cadastrais. O **RH** entra com e-mail e senha e preenche tudo.

- Banco de dados e logins: [Supabase](https://supabase.com) (plano gratuito).
- Hospedagem do site: GitHub Pages (gratuito).

## Como funciona o acesso

1. O RH cadastra o colaborador (nome, CPF, cargo, jornada…).
2. O portal gera um **código de primeiro acesso** de 6 letras ou números. O RH copia a mensagem pronta e manda pelo WhatsApp.
3. No celular, o colaborador toca em **Primeiro acesso**, digita o CPF e o código e cria a própria senha.
4. Se a pessoa esquecer a senha, o RH gera um novo código.

Cada colaborador só enxerga os próprios dados. Isso é garantido pelo banco de dados (Row Level Security), não só pela tela.

## Instalação (uma vez só)

### 1. Supabase
1. Crie um projeto em <https://supabase.com>.
2. Abra **SQL Editor → New query**, cole todo o conteúdo de `supabase/schema.sql` e clique em **Run**.
3. Vá em **Authentication → Sign In / Providers → Email** e **desligue “Confirm email”**. O login é por CPF e não há e-mail para confirmar.
4. Em **Project Settings → API**, copie a **Project URL** e a chave **anon public**.

### 2. Configuração do site
Abra `config.js` e cole a Project URL e a chave anon public. A chave anon é pública. **Nunca** coloque a chave `service_role` neste arquivo.

### 3. Publicação (GitHub Pages)
No repositório: **Settings → Pages → Source: Deploy from a branch → Branch: main / (root)**. O endereço fica parecido com `https://SEU-USUARIO.github.io/portal-do-colaborador/`.

### 4. Primeiro acesso do RH
Abra o site, toque na aba **RH** e em **“Primeira vez? Criar conta do RH”**. Essa opção só funciona uma vez: depois que a conta do RH existe, ninguém mais consegue criar outra por ali.

Em seguida, vá na aba **Empresa** e preencha a razão social, o CNPJ e o logotipo.

## Assinatura eletrônica

O colaborador assina com o dedo a folha de ponto de cada mês e, depois, o recebimento do holerite. O portal guarda o desenho da assinatura, a data e a hora, o IP, o aparelho e um código de verificação do conteúdo. Se o RH mudar a folha ou o holerite depois, a assinatura é apagada e o colaborador assina de novo.

Quem já tinha instalado o portal antes dessa função precisa rodar `supabase/assinaturas.sql` no SQL Editor (uma vez).

## Obras

Cada colaborador pode ter uma **obra** no cadastro (ou na coluna Obra da planilha). Na aba Equipe, o filtro mostra só os colaboradores da obra escolhida, e o Resumo de horas pode sair por obra. Quem já tinha instalado o portal antes precisa rodar `supabase/obra.sql` no SQL Editor (uma vez).

## Ponto automático e situação

- No cadastro, cada colaborador tem um **horário padrão** por dia da semana (entrada, saída para o almoço, volta e saída).
- Com o **ponto automático** ligado (vem ligado), todo dia de trabalho que já passou entra sozinho com esse horário. O RH só lança o que foge disso: falta (ocorrência **Falta**), atestado, folga, férias ou um horário diferente. Dias em branco no editor usam o horário padrão.
- **Situação**: Ativo ou Desligado, com a data do desligamento. Depois dessa data o ponto automático para. Na aba Equipe dá para filtrar por situação e por obra/projeto.
- Quem já tinha instalado o portal antes precisa rodar `supabase/ponto-automatico.sql` no SQL Editor (uma vez).

## Regras da folha de ponto

- Jornada prevista por dia da semana no cadastro do colaborador (ex.: seg a qui 09:00, sex 08:00).
- Horas extras e atrasos são calculados por dia. Diferenças de até **10 minutos** no dia são ignoradas (art. 58, §1º da CLT).
- Extras **50%** de segunda a sexta, **100%** no sábado e **110%** em domingos e feriados.
- Turnos que passam da meia-noite são aceitos (ex.: entrada 22:00 e saída 06:00). As horas entre 22h e 5h aparecem como **noturnas** e o cálculo do holerite inclui o **adicional noturno** com hora reduzida de 52min30s: **20%** de segunda a sexta, **100%** no sábado e **110%** em domingos e feriados. No holerite, o RH pode incluir ou apagar qualquer provento ou desconto antes de salvar.
- Feriados nacionais entram automaticamente. Feriados locais: marque a ocorrência “Feriado” no dia.
- As ocorrências “Sem expediente”, “Folga”, “Atestado” e “Férias” zeram a jornada prevista do dia.

## Cálculo do holerite (botão “Calcular holerite pela folha”)

O RH abre o colaborador, toca em **Calcular holerite de <mês> pela folha**, confere e salva. O portal monta:

- **Horas normais**: salário base. Horas do mês pela jornada semanal (44 h → 220 h).
- **Horas extras** 50%, 100% e 110% a partir da folha, com valor da hora = salário ÷ horas do mês.
- **DSR sobre extras**: extras ÷ dias úteis × (domingos + feriados do mês).
- **Atrasos e faltas**: horas × valor da hora (o desconto do DSR por falta não é automático; ajuste à mão se precisar).
- **INSS** progressivo, **IRRF** (com dependentes, desconto simplificado quando for melhor e a redução de 2026 para quem ganha até R$ 7.350) e **FGTS** de 8% no rodapé.
- **Adiantamento** é informado na hora de calcular.

Tabelas de 2026 no `app.js` (constante `PARAM`). Quando o governo mudar as tabelas, é só atualizar ali. Confira sempre o holerite com a sua contabilidade antes de liberar.

## Arquivos

| Arquivo | Para que serve |
|---|---|
| `index.html` | Telas e estilo |
| `app.js` | Funcionamento do portal |
| `config.js` | Endereço e chave do Supabase, nome e logo da empresa |
| `logo.jpeg` | Logotipo da Lago Engenharia |
| `supabase/schema.sql` | Tabelas, permissões e funções do banco |
| `preview/` | Versão de demonstração com dados fictícios (não usa o Supabase) |

## Abonar faltas e horas a menos

Na tela do colaborador, clique em **Lançar faltas / ajustes** e, no dia, escolha a ocorrência **Abonado** (ou **Atestado**) e escreva o motivo em Observação.

- Sem horários no dia: o dia inteiro é abonado e não conta como falta.
- Com horários (ex.: saiu 2 h mais cedo): as horas que faltaram são abonadas e não viram atraso.

As horas abonadas aparecem na folha, na tela do colaborador e no Resumo de horas (Excel), e não entram como desconto no cálculo do holerite.

## Pendências do colaborador (só o RH)

Na tela do colaborador há o quadro **Pendências**: escreva o que falta (ex.: entregar atestado), coloque um prazo se quiser e marque quando resolver. Na Equipe, quem tem pendência em aberto aparece com 📌 e há o filtro “Só com pendências”.

Só o acesso do RH vê. A proteção está no banco (RLS): o colaborador não consegue ler as pendências nem pela API. Para ativar, rode uma vez o arquivo `supabase/pendencias.sql` no Supabase.

## Holerite de 13º, férias e outros

Cada holerite tem um **Tipo**: Mensal, 13º salário · 1ª parcela, 13º salário · 2ª parcela, Férias, Adiantamento ou Rescisão. Assim o holerite mensal e o do 13º convivem no mesmo mês.

- **À mão:** Holerites → Lançar holerite à mão → escolha o mês e o Tipo.
- **Excel:** na aba Holerites, coluna **Tipo** (em branco = Mensal; ex.: “13º 1ª parcela”).
- Holerites que não são o mensal abrem para o colaborador sem precisar assinar a folha de ponto antes.

Para ativar, rode uma vez `supabase/tipo-holerite.sql` no Supabase.
