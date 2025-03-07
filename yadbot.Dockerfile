FROM node:18

# set timezone. /etc/timezone changing seems to
# have no effect, setting it anyway to be safe.
RUN echo "Europe/Berlin" > /etc/timezone
RUN ln -sf /usr/share/zoneinfo/Europe/Berlin /etc/localtime
# reload timezone config
RUN dpkg-reconfigure -f noninteractive tzdata

RUN apt-get update && apt-get install -y nano

# set working directory
WORKDIR /usr/src/app
# npm install all needed packages
COPY ./package.json .
COPY ./package-lock.json .
RUN npm install
RUN npx playwright install
RUN npx playwright install-deps
# copy all files from git root into container workdir
# (except files and folders in .dockerignore)
COPY . .


# run the server
CMD [ "npm", "run", "start" ]
