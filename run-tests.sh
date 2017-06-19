#!/bin/bash

source .env && mocha --compilers coffee:coffee-script/register test/*.coffee
