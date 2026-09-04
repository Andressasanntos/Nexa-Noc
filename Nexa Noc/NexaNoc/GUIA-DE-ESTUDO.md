# Guia de estudo — NOC Flow Studio

Este arquivo foi incluído para você aprender modificando o próprio projeto.

## 1. Quem é quem

| Arquivo | Responsabilidade | Pense nele como |
|---|---|---|
| `public/index.html` | Estrutura da página | Esqueleto |
| `public/style.css` | Cores, tamanhos, layout, responsividade | Aparência |
| `public/script.js` | Cliques, buscas, formulários, LocalStorage | Comportamento |
| `app.py` | Servidor Flask, APIs, processamento Python | Backend |
| `requirements.txt` | Bibliotecas Python necessárias | Dependências |

---

## 2. Caminho de um clique

Exemplo: botão **Gerar saída** do chamado.

### HTML
Você encontra:

```html
<button id="generateTicketBtn">Gerar saída</button>
```

### JavaScript
Depois procura o mesmo ID:

```javascript
$("#generateTicketBtn").addEventListener("click", generateTicketOutputs);
```

Isso significa:

> quando o elemento `generateTicketBtn` receber um clique, execute `generateTicketOutputs`.

Essa é uma das formas mais importantes de entender aplicações web.

---

## 3. Como adicionar um comando de rede

Procure em `script.js`:

```javascript
const commands = [
```

Adicione um objeto:

```javascript
{
  id: "c99",
  vendor: "Cisco",
  category: "BGP",
  title: "Resumo BGP",
  description: "Mostra os vizinhos e estado das sessões BGP.",
  command: "show ip bgp summary"
}
```

Você não precisa criar um card novo no HTML.

A função `renderCommands()` fará isso por você.

### O que você aprende aqui

- arrays
- objetos
- renderização dinâmica
- filtros
- eventos

---

## 4. Como adicionar uma cidade/sigla

Em `script.js`, localize:

```javascript
references.siglas
```

A estrutura é:

```javascript
["CIDADE", "SIGLA"]
```

Exemplo:

```javascript
["NOVA CIDADE", "NVC"]
```

Depois de salvar e atualizar a página, a busca já passa a encontrar essa cidade.

---

## 5. Como criar um tema novo

O sistema de temas é um ótimo exercício de CSS.

### Passo 1 — CSS

Crie:

```css
html[data-theme="meutema"] {
  --bg: #...;
  --surface: #...;
  --text: #...;
  --primary: #...;
}
```

### Passo 2 — JavaScript

Adicione o nome ao conjunto:

```javascript
const VALID_THEMES = new Set([
  "oceano",
  "gelo",
  "cafe",
  "rubi",
  "meutema"
]);
```

### Passo 3 — HTML

Adicione um botão no `appearanceModal` com:

```html
data-theme-choice="meutema"
```

### O que você aprende

Aqui você percebe como HTML + CSS + JS trabalham juntos.

---

## 6. LocalStorage

O projeto usa:

```javascript
localStorage.setItem("chave", "valor");
localStorage.getItem("chave");
```

Ele salva dados no navegador.

É adequado para:

- preferências
- tema
- notas simples
- favoritos
- perfil local

Não é adequado para:

- senhas
- tokens
- grande volume de dados
- dados compartilhados entre vários usuários

Para isso, uma evolução natural é usar SQLite/PostgreSQL no backend Python.

---

## 7. Como o JavaScript conversa com Python

No JavaScript:

```javascript
fetch("/api/ai-assist", {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    task,
    context
  })
});
```

No Python:

```python
@app.post("/api/ai-assist")
def ai_assist():
    payload = request.get_json()
```

É uma comunicação HTTP.

Isso é fundamental para entender sistemas web.

---

## 8. Exercícios para aprender sem quebrar o sistema

Faça um por vez.

### Nível 1

1. Troque o texto de um botão.
2. Altere o `border-radius` dos cards.
3. Adicione um modelo de mensagem.
4. Adicione uma cidade.
5. Adicione um comando.

### Nível 2

1. Crie uma nova categoria de comandos chamada `BGP`.
2. Crie um quinto tema.
3. Adicione um novo indicador ao Dashboard.
4. Crie um botão para limpar as notas.
5. Faça a busca global também localizar cidades.

### Nível 3

1. Mova comandos para um arquivo JSON.
2. Crie uma API Flask `/api/commands`.
3. Passe a carregar os comandos com `fetch()`.
4. Adicione SQLite.
5. Crie histórico de chamados no banco.

---

## 9. Ordem que recomendo estudar

1. HTML básico
2. CSS básico
3. Flexbox
4. CSS Grid
5. JavaScript: variáveis e funções
6. arrays e objetos
7. DOM
8. eventos
9. `map`, `filter`, `find`
10. LocalStorage
11. `async/await`
12. `fetch`
13. Python
14. Flask
15. APIs REST
16. SQLite
17. Git/GitHub

---

## 10. Regra para não se perder

Quando encontrar algo na tela e quiser saber de onde vem:

### Se for texto/campo fixo
Procure no `index.html`.

### Se for cor/espaçamento/tamanho
Procure no `style.css`.

### Se mudar após clique/digitação
Procure no `script.js`.

### Se depender de `/api/...`
Procure no `app.py`.

Essa regra resolve boa parte da navegação pelo projeto.

---

## 11. Segurança

Nunca coloque no front-end:

```text
senha
token
API key
chave SSH
credencial de banco
```

HTML, CSS e JavaScript entregues ao navegador podem ser inspecionados.

Segredos pertencem ao backend e, de preferência, em variáveis de ambiente.

---

## 12. Próxima evolução ideal

Quando você estiver confortável com esta versão, uma evolução didática muito boa é:

**mover siglas, comandos, contatos e redes do `script.js` para arquivos JSON ou SQLite.**

Assim você começa a separar:

- interface
- lógica
- dados

Esse é um passo importante para sair de uma página web e chegar a uma aplicação organizada.
