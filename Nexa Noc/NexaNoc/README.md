# NOC Flow Studio V4

Ferramenta web para apoio operacional de NOC, com foco em produtividade, busca rápida e experiência de uso agradável.

## Novidades desta versão

- **117 siglas/localidades** cadastradas a partir da base operacional fornecida.
- Pesquisa por **cidade ou sigla** com destaque do resultado.
- Botão para **copiar a sigla** diretamente da tabela.
- **49 IDs de rede** cadastrados para consulta.
- Gerador seguro do comando `/bin/gerar3.sh [ID]` sem armazenar credenciais no front-end.
- Busca por ID, nome da rede ou cidade/localidade.
- Contatos operacionais consolidados, incluindo RNP.
- Mantém Dashboard, Chamados, Modelos, Comandos, Parser, Assistente IA local e Referências.

## Módulos

### Dashboard
- indicadores locais de produtividade
- notas do turno com salvamento automático
- atalhos rápidos

### Chamados
- formulário único
- texto técnico / GLPI
- mensagem ao cliente
- RFO básico

### Modelos
- biblioteca de mensagens
- pesquisa e categorias
- modelos personalizados salvos no navegador

### Command Explorer
- Cisco e Huawei
- filtros por fabricante e categoria
- busca
- favoritos
- copiar comando

### Parser de Incidentes
- extrai host, interface, IPs, data, hora, duração e status
- produz resumo técnico inicial

### Assistente IA
- gera prompts prontos
- endpoint Flask com assistência local
- estrutura preparada para integração futura com um provedor de IA

### Referências
- 117 siglas/localidades
- busca instantânea
- contatos
- 49 redes/IDs
- gerador de comando de regra

## Segurança

O projeto **não armazena senhas, tokens ou credenciais de acesso no HTML/JavaScript**.

Credenciais reais nunca devem ficar no front-end, pois podem ser vistas pelo código-fonte do navegador.

## Como executar no Windows

```bash
python -m venv .venv
```

```bash
.venv\Scripts\activate
```

```bash
pip install -r requirements.txt
```

```bash
python app.py
```

Depois abra:

```text
http://127.0.0.1:5000
```

## Estrutura

```text
noc-flow-studio/
├── app.py
├── README.md
├── requirements.txt
└── public/
    ├── index.html
    ├── style.css
    └── script.js
```


## Personalização da interface

A versão V5 adiciona personalização persistente no navegador:

- **Oceano Noturno** — tema padrão azul escuro.
- **Gelo** — tema claro em tons de branco e azul gelo.
- **Café com Leite** — tema quente em creme e marrom.
- **Rubi Escuro** — tema escuro em preto/bordô e vermelho.
- Perfil editável com nome e função.
- Escolha entre ícones prontos ou uma imagem local.
- A imagem de perfil é redimensionada antes de ser salva no `localStorage`.
- Tema e perfil também entram na exportação/importação dos dados do NOC Flow Studio.

Nenhuma imagem de perfil é enviada para servidor na configuração padrão; ela permanece no navegador.


## Aprendendo com o código

A V6 recebeu comentários explicativos nos arquivos principais.

Também foi incluído o arquivo:

`GUIA-DE-ESTUDO.md`

Ele explica a função de HTML, CSS, JavaScript e Python, além de trazer exercícios de evolução do próprio sistema.
