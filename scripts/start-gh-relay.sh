#!/usr/bin/env bash
# Compat wrapper → start-host-relay.sh
exec "$(cd "$(dirname "$0")" && pwd)/start-host-relay.sh" "$@"
