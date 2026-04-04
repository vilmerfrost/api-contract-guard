# Bitbucket Pipeline Setup

Add API contract regression tests to your Bitbucket Pipeline in 2 steps.

## 1. Add Repository Variables

Go to **Repository Settings > Pipelines > Repository Variables** and add:

| Variable | Secured | Description |
|----------|---------|-------------|
| `SWAGGER_URL` | No | URL to your OpenAPI/Swagger JSON spec |
| `TOKEN_URL` | No | OAuth2 token endpoint |
| `API_USERNAME` | Yes | OAuth2 username |
| `API_PASSWORD` | Yes | OAuth2 password |

## 2. Add the Pipeline Step

### Option A: Bitbucket Pipe (recommended)

Add this step to your `bitbucket-pipelines.yml`:

```yaml
pipelines:
  default:
    - step:
        name: API Contract Tests
        script:
          - pipe: docker://your-org/api-contract-guard:latest
            variables:
              SWAGGER_URL: $SWAGGER_URL
              TOKEN_URL: $TOKEN_URL
              API_USERNAME: $API_USERNAME
              API_PASSWORD: $API_PASSWORD
        artifacts:
          - test-results/**
```

### Option B: Docker Image

Use the Docker image directly as the step image:

```yaml
pipelines:
  default:
    - step:
        name: API Contract Tests
        image: your-org/api-contract-guard:latest
        script:
          - api-contract-guard test
              --swagger-url $SWAGGER_URL
              --token-url $TOKEN_URL
              --username $API_USERNAME
              --password $API_PASSWORD
              --no-auto-start-vm
              --output test-results/junit.xml
        artifacts:
          - test-results/**
```

## Configuration Options

All options are passed as pipe `variables` (Option A) or CLI flags (Option B).

| Variable | CLI Flag | Default | Description |
|----------|----------|---------|-------------|
| `SWAGGER_URL` | `--swagger-url` | *required* | OpenAPI/Swagger JSON URL |
| `TOKEN_URL` | `--token-url` | *required* | OAuth2 token endpoint |
| `API_USERNAME` | `--username` | *required* | OAuth2 username |
| `API_PASSWORD` | `--password` | *required* | OAuth2 password |
| `TEST_MODE` | `--mode` | `readonly` | `readonly` (GET only) or `full` (CRUD) |
| `OUTPUT` | `--output` | `test-results/junit.xml` | JUnit XML output path |
| `PARALLEL` | `--parallel` | `false` | Run tests in parallel |
| `MAX_PARALLEL` | `--max-parallel` | `5` | Max parallel tests |
| `AUTO_START_VM` | `--auto-start-vm` | `false` | Auto-start Azure VM if API is down |
| `USE_HIERARCHICAL` | `--use-hierarchical` | `false` | Test parent-child relationships |
| `TEST_POSTS` | `--test-posts` | `false` | Run POST fixture tests |
| `EXTRA_ARGS` | *(direct)* | `""` | Additional CLI flags to pass through |

## Examples

### Readonly GET tests (default, safest for CI)

```yaml
- pipe: docker://your-org/api-contract-guard:latest
  variables:
    SWAGGER_URL: $SWAGGER_URL
    TOKEN_URL: $TOKEN_URL
    API_USERNAME: $API_USERNAME
    API_PASSWORD: $API_PASSWORD
```

### Full CRUD tests with POST fixtures

```yaml
- pipe: docker://your-org/api-contract-guard:latest
  variables:
    SWAGGER_URL: $SWAGGER_URL
    TOKEN_URL: $TOKEN_URL
    API_USERNAME: $API_USERNAME
    API_PASSWORD: $API_PASSWORD
    TEST_MODE: "full"
    TEST_POSTS: "true"
```

### Parallel execution

```yaml
- pipe: docker://your-org/api-contract-guard:latest
  variables:
    SWAGGER_URL: $SWAGGER_URL
    TOKEN_URL: $TOKEN_URL
    API_USERNAME: $API_USERNAME
    API_PASSWORD: $API_PASSWORD
    PARALLEL: "true"
    MAX_PARALLEL: "10"
```

## JUnit Reports

The pipeline produces a JUnit XML report at the `OUTPUT` path (default `test-results/junit.xml`). Bitbucket automatically picks up JUnit artifacts if you add them under `artifacts`.

To see test results in the Bitbucket UI, make sure your step includes:

```yaml
artifacts:
  - test-results/**
```
