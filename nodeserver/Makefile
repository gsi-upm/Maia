
REPORTER = spec

test:
	@NODE_ENV=test ./node_modules/.bin/mocha \
	--reporter $(REPORTER) \

test-w:
	@NODE_ENV=test ./node_modules/.bin/mocha \
		--reporter $(REPORTER) \
		--growl \
		--watch

test-cov: lib-cov
	@MAIA_COV=1 $(MAKE) test REPORTER=html-cov > public/coverage.html

lib-cov:
	@jscoverage lib lib-cov

.PHONY: test test-w
