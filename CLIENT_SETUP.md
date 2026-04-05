# API Contract Guard — Bitbucket Pipeline Setup

This runs automated API contract regression tests against your demo environment on every pull request.

## Setup (one-time)

### Step 1: Add repository variables

Go to your Bitbucket repo → **Settings** → **Repository variables** and add:

| Variable | Value | Secured |
|----------|-------|---------|
| `API_USERNAME` | Your OAuth2 username | Yes |
| `API_PASSWORD` | Your OAuth2 password | Yes |

### Step 2: Add to your `bitbucket-pipelines.yml`

Add this `pull-requests` section to your existing `bitbucket-pipelines.yml`.

If you **don't have** a `bitbucket-pipelines.yml` yet, create one at the root of your repo with this content:

```yaml
image: node:18

pipelines:
  pull-requests:
    '**':
      - step:
          name: API Contract Regression Tests
          image: simplitics/api-contract-guard:latest
          script:
            - /app/pipe.sh
          artifacts:
            - test-results/**
          variables:
            SWAGGER_URL: "https://pdq.swedencentral.cloudapp.azure.com/dev/app/openapi.json"
            TOKEN_URL: "https://pdq.swedencentral.cloudapp.azure.com/dev/app/token"
            API_USERNAME: $API_USERNAME
            API_PASSWORD: $API_PASSWORD
            TEST_MODE: "readonly"
```

If you **already have** a `bitbucket-pipelines.yml`, just add the `pull-requests` block under `pipelines:`:

```yaml
pipelines:
  # ... your existing pipelines ...

  pull-requests:
    '**':
      - step:
          name: API Contract Regression Tests
          image: simplitics/api-contract-guard:latest
          script:
            - /app/pipe.sh
          artifacts:
            - test-results/**
          variables:
            SWAGGER_URL: "https://pdq.swedencentral.cloudapp.azure.com/dev/app/openapi.json"
            TOKEN_URL: "https://pdq.swedencentral.cloudapp.azure.com/dev/app/token"
            API_USERNAME: $API_USERNAME
            API_PASSWORD: $API_PASSWORD
            TEST_MODE: "readonly"
```

That's it. Commit and push.

## What happens

1. Developer creates a PR from a feature branch
2. Bitbucket automatically runs the **API Contract Regression Tests** step
3. The tool fetches the OpenAPI spec from the demo environment
4. All endpoints are tested (GET requests) against the live demo API
5. Results appear in the PR as a pass/fail status
6. JUnit XML report is saved as a build artifact

## Options

You can customize the step by adding more variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `TEST_MODE` | `readonly` | `readonly` = GET only, `full` = full CRUD |
| `PARALLEL` | `false` | Run tests in parallel |
| `MAX_PARALLEL` | `5` | Max concurrent tests when parallel is on |
| `TEST_POSTS` | `false` | Also test POST endpoints with fixtures |
| `AUTO_START_VM` | `false` | Auto-start the Azure VM if API is down |
| `EXTRA_ARGS` | _(empty)_ | Any additional CLI flags |

Example with more options:

```yaml
          variables:
            SWAGGER_URL: "https://pdq.swedencentral.cloudapp.azure.com/dev/app/openapi.json"
            TOKEN_URL: "https://pdq.swedencentral.cloudapp.azure.com/dev/app/token"
            API_USERNAME: $API_USERNAME
            API_PASSWORD: $API_PASSWORD
            TEST_MODE: "readonly"
            PARALLEL: "true"
            MAX_PARALLEL: "10"
```

## Troubleshooting

**Pipeline fails with "SWAGGER_URL is required"**
→ Make sure the `variables` block is inside the step, not at the pipeline level.

**401 Unauthorized**
→ Check that `API_USERNAME` and `API_PASSWORD` are set correctly in repo variables.

**API is unreachable / connection timeout**
→ The demo VM may be shut down (it auto-stops at 23:00 CET). Set `AUTO_START_VM: "true"` or start it manually in Azure Portal.

**Image not found**
→ Make sure the Docker image `simplitics/api-contract-guard:latest` exists on DockerHub. Contact Simplitics if unsure.
