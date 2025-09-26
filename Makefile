SHELL := /bin/bash
.PHONY: shellcheck

shellcheck:
	@echo "Running shellcheck on all .sh files"
	@find . -type f -name '*.sh' -not -path './node_modules/*' -print0 | xargs -0 shellcheck -x || true
