#!/bin/bash

set -e -o pipefail

PYTHONPATH=pylibs HEJ_SESSION_KEY=sikrit uvicorn --reload hej.app:app
