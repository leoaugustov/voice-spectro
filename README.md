# Voice Spectro [![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/leoaugustov/voice-spectro/blob/main/LICENSE) [![Build Status](https://app.travis-ci.com/leoaugustov/voice-spectro.svg?branch=main)](https://app.travis-ci.com/github/leoaugustov/voice-spectro)

## Para instalar, configurar e rodar o projeto na sua máquina
Para executar a aplicação de forma **totalmente funcional** é necessário que ela seja **servida via HTTPS**.

Para que o Webpack consiga servir a aplicação usando esse protocolo **é necessário** que exista **na pasta raiz do projeto** os arquivos **`localhost+2-key.pem` e `localhost+2.pem`**. Esse arquivos são referentes ao certificado TLS do servidor e para gerá-los **recomendo o uso do [mkcert](https://github.com/FiloSottile/mkcert)**.

### Instale e configure o mkcert
Para instalar a ferramenta, siga o [tutorial oficial](https://github.com/FiloSottile/mkcert#installation) de acordo com o seu sistema operacional.

Em seguida, execute o seguinte comando:
    
    $ mkcert -install

Por fim, **na pasta raiz do projeto**, execute o comando:

    $ mkcert localhost 127.0.0.1 ::1

Se tudo der certo, nesse momento os arquivos `localhost+2-key.pem` e `localhost+2.pem` já estarão criados.

**Atenção**, se você estiver **executando a aplicação dentro do WSL no Windows** é necessário instalar o mkcert e rodar o comando `mkcert -install` em ambos os sistemas.

Além disso, é necessário **copiar os certificados gerados no Windows e inseri-los substituindo os gerados pelo WSL**. Para descobrir em qual diretório estão os certificados use o comando `mkcert -CAROOT`. Mais detalhes podemos ser encontrados [neste post](https://www.haveiplayedbowie.today/blog/posts/secure-localhost-with-mkcert/).

### Instale as dependências da aplicação
    $ npm install

### Inicie o servidor de desenvolvimento
    $ npm start

Em seu navegador acesse https://localhost:9000

