FROM node:latest
WORKDIR /code
COPY . .
RUN ["npm","install"]
ENTRYPOINT [ "npm" ]
CMD [ "start" ]