REPORTER ?= dot

test:
	@NODE_ENV=test ./node_modules/mocha/bin/mocha -R $(REPORTER)

stats:
	@./node_modules/stats/bin/stats -T lib

.PHONY: test stats
