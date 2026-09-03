#!/bin/bash
cd "$(dirname "$0")"
java -jar target/contextband-ai-0.1.0-SNAPSHOT.jar &
echo $!
wait
