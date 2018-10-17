FROM node:10.12.0-stretch
RUN apt update -y && \
    apt install -y \
    procps  \
    joe

ENV APP_DIR=/code
WORKDIR $APP_DIR

RUN yarn global add nodemon --prefix $APP_DIR/global_node_modules
RUN yarn global add babel-cli --prefix $APP_DIR/global_node_modules

ADD package.json package.json
ADD yarn.lock yarn.lock

RUN yarn install

ADD . $APP_DIR
