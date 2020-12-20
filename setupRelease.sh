#!/usr/bin/env bash
export SENTRY_AUTH_TOKEN=f95012ca57d843c8807c93cec2c07e741b586d1dd7f4478fa8500cc3bbc8f788
export SENTRY_ORG=test-44u
VERSION=$(sentry-cli releases propose-version)

# Create a release
sentry-cli releases new -p project1 "$VERSION"

# Associate commits with the release
sentry-cli releases set-commits --auto "$VERSION" hahahehe
