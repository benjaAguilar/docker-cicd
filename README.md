# DOCKER & CI/CD
This repo aims to practice my journey learning [Docker](https://www.docker.com) and [Github Actions CI/CD](https://github.com/features/actions).
Since the last few weeks (at the moment im writing this) i started with the idea that i wanted to build real software, A software that you can `TRUST`, deploy to production, work with developers and be the less error prone possible. 
With a little research i came up with the solution, i need to learn `Docker` to handle the famous: *"It worked on my machine"* and learn `CI/CD` (continuous integration / continuous delivery) to ensure that the code works and meets the standards before pushing changes or merging a branch.

> [!IMPORTANT] this repo does not aim for the best practices on code, focuses on docker and ci/cd practices. 

## About Docker
Docker is provides the ability to run our application in an isolated environment which is called container. That container has what is needed to run the software, including the code and all of the environment and dependency versions provided.

So if i build and app with node:22 and i wanted to share the app to work with other developers they dont even need the same version as me. they just need to run the container or if i want to deploy the app on a server that does not even have node its possible to! again *"just run the container"*.

### Dockerfile
The dockerfile is a set of instructions that docker gonna run on its environment. you have commands such as `FROM`, `CMD`, `COPY`, `RUN`, `WORKDIR` and more.
> [!TIP] Lets use the actual dockerfile as example

```
FROM node:22 # specify wich docker image use

RUN mkdir -p /home/app 
# RUN runs a specific shell command, this case we create the home dir.

COPY . /home/app
# COPY copies everything we have on specified folder to the container folder

EXPOSE 3000
# EXPOSE exposes a speciefied port

CMD ["node", "/home/app/index.js"]
# CMD runs a command, in this case we start our node app wich runs on port 3000
```

*This was my first dockerfile after reading some docs and watch tutorials*

It works, but it can be better for production environments.
By now we are copying everything from the root folder to our container adding unnecessary stuff like `.git` folder for example. Our what could happen if a developer clones the repo, does not install the dependencies meaning that does not have node_modules folder with stuff that needs the app to work and runs the container? Of course its gonna crash.

Instead of copying everything we can make use of `.dockerignore` to reduce the container size and bloat and also install the dependencies needed with `npm`.
