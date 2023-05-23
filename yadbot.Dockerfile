FROM discord


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
# copy all files from git root into container workdir
# (except files and folders in .dockerignore)
COPY . .

# delete old build of the website inside /server/client-build
RUN npm run delete-build
# create new build of the website inside /server/client-build
RUN npm run create-build

# listen on ports which are needed
# does NOT have any effect on the host
# (read: https://docs.docker.com/engine/reference/builder/#expose)
# express webserver
EXPOSE 8080
# websocket server
EXPOSE 8081

# run the server
CMD [ "npm", "run", "run-server" ]
