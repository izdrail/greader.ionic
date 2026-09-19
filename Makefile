IMAGE ?= izdrail/greaderapp.com
TAG ?= latest
PLATFORM ?=

.PHONY: help install test build image up down logs clean
help:
	@printf '%s\n' \
	  'make install  - install locked dependencies' \
	  'make test     - run client, proxy and Worker tests plus lint' \
	  'make build    - production Ionic build' \
	  'make image    - build $(IMAGE):$(TAG)' \
	  'make up       - build and start Docker Compose on port $${PORT:-3000}' \
	  'make down     - stop Docker Compose' \
	  'make logs     - follow app logs'

install:
	npm ci

test:
	npm test -- --watch=false
	npm run test:server
	npm run lint
	npm audit --omit=dev

build:
	npm run build

image:
	docker build $(if $(PLATFORM),--platform $(PLATFORM),) --tag $(IMAGE):$(TAG) .

up:
	IMAGE=$(IMAGE) TAG=$(TAG) docker compose up --build -d

down:
	docker compose down

logs:
	docker compose logs --follow greader

clean:
	rm -rf www .angular/cache
