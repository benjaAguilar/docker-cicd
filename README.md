# DOCKER & CI/CD
This repo aims to practice my journey learning [Docker](https://www.docker.com) and [Github Actions CI/CD](https://github.com/features/actions).
Since the last few weeks (at the moment im writing this) i started with the idea that i wanted to build real software, A software that you can `TRUST`, deploy to production, work with developers and be the less error prone possible. 
With a little research i came up with the solution, i need to learn `Docker` to handle the famous: *"It worked on my machine"* and learn `CI/CD` (continuous integration / continuous delivery) to ensure that the code works and meets the standards before pushing changes or merging a branch.

## About Docker
Docker is provides the ability to run our application in an isolated environment which is called container. That container has what is needed to run the software, including the code and all of the environment and dependency versions provided.

So if i build and app with node:22 and i wanted to share the app to work with other developers they dont even need the same version as me. they just need to run the container or if i want to deploy the app on a server that does not even have node its possible to! again *"just run the container"*
