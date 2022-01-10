#!/bin/bash

set -e -o pipefail

PYTHONPATH=pylibs uvicorn --reload hej.app:app
