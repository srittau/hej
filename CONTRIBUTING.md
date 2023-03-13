## Preparing the environment

Create a Python virtual environment, activate it, and install dependencies:

```
$ python3.11 -m venv .venv
$ source .venv/bin/activate
$ pip install -U pip
$ pip install -r requirements.txt
```

Prepare the JavaScript environment using yarn:

```
$ yarn install --frozen-lockfile
```

Optional: Build the docker container:

```
$ docker-compose build
```

## Running the tests

Running the Python tests, using the activated virtual environment:

```
$ pytest
```

Running the JavaScript tests:

```
$ yarn test --watchAll=false
```

During development it's often easier to run the tests in interactive mode using just `yarn test`.

## Starting the test servers

To start the backend server, run `./start.sh` in an activated virtual
environment. Then you can start the react development server using
`yarn start`.
