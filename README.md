# Fio & Açucar

Aplicativo estático para controle de estoque e geração de orçamentos de costura, preparado para rodar diretamente no GitHub Pages.

## Publicação no GitHub Pages

1. Aponte o GitHub Pages para a branch `main`.
2. Use a origem `/root` do repositório.
3. Acesse pela URL publicada do repositório.

O app usa rotas por hash (`#inicio`, `#estoque`, `#orcamento`, `#relatorios`) para funcionar bem em páginas estáticas. O arquivo `404.html` redireciona acessos diretos como `/orcamento` para `#orcamento`.
