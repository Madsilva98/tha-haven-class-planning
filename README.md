# The Haven — Instructor Platform

## Instalação (só na primeira vez)

1. Abre o terminal na pasta `haven-app`
2. Corre:
   ```
   npm install
   ```

## Configurar a API key (para as funcionalidades de IA)

A IA (gerar cues, músculos, notas) precisa de uma API key da Anthropic.

**Passo 1** — Vai a https://console.anthropic.com e cria uma conta (ou entra se já tens).

**Passo 2** — Cria uma API key em: API Keys → Create Key. Copia-a.

**Passo 3** — Na pasta `haven-app`, cria um ficheiro chamado `.env` com este conteúdo:
```
ANTHROPIC_API_KEY=sk-ant-...a-tua-key-aqui...
```

**Passo 4** — Guarda o ficheiro. Pronto.

> Sem a API key, a app funciona normalmente — só os botões de IA ficam desactivados.

## Abrir a app

```
npm run dev
```

Depois abre o browser em: **http://localhost:5173**

## Onde ficam os dados

A pasta `data/` contém os teus ficheiros:
- `data/series.json` — todas as séries
- `data/classes.json` — todas as aulas  
- `data/aistyle.json` — as tuas preferências de estilo de IA

Faz backup desta pasta quando quiseres.

## Para fechar

`Ctrl + C` no terminal.
