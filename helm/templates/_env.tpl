{{/*
Container env vars from .Values.application (and optional raw .Values.env overrides).
*/}}
{{- define "travorse.env" -}}
{{- $app := .Values.application | default dict }}
{{- $auth := $app.auth | default dict }}
{{- $skip := .Values.envSkip | default dict }}

{{- with $app.basePath }}
{{- if not (hasKey $skip "NEXT_PUBLIC_BASE_PATH") }}
- name: NEXT_PUBLIC_BASE_PATH
  value: {{ . | quote }}
{{- end }}
{{- end }}

{{- with $app.publicUrl }}
{{- if not (hasKey $skip "AUTH_URL") }}
- name: AUTH_URL
  value: {{ . | quote }}
{{- end }}
{{- end }}

{{- with $auth.issuer }}
{{- if not (hasKey $skip "OIDC_ISSUER") }}
- name: OIDC_ISSUER
  value: {{ . | quote }}
{{- end }}
{{- end }}

{{- with $auth.clientId }}
{{- if not (hasKey $skip "OIDC_CLIENT_ID") }}
- name: OIDC_CLIENT_ID
  value: {{ . | quote }}
{{- end }}
{{- end }}

{{- with $auth.scope }}
{{- if not (hasKey $skip "OIDC_SCOPE") }}
- name: OIDC_SCOPE
  value: {{ . | quote }}
{{- end }}
{{- end }}

{{- if hasKey $auth "trustHost" }}
{{- if not (hasKey $skip "AUTH_TRUST_HOST") }}
- name: AUTH_TRUST_HOST
  value: {{ $auth.trustHost | quote }}
{{- end }}
{{- end }}

{{- $secretCreate := ($auth.secrets | default dict).create }}
{{- $defaultSecretName := default (printf "%s-application" (include "travorse.fullname" .)) (($auth.secrets | default dict).name) }}
{{- with $auth.authSecret }}
{{- $secretName := .existingSecret }}
{{- if and (not $secretName) $secretCreate }}
{{- $secretName = $defaultSecretName }}
{{- end }}
{{- if and $secretName .secretKey (not (hasKey $skip "AUTH_SECRET")) }}
- name: AUTH_SECRET
  valueFrom:
    secretKeyRef:
      name: {{ $secretName | quote }}
      key: {{ .secretKey | quote }}
{{- end }}
{{- end }}

{{- with $auth.clientSecret }}
{{- $secretName := .existingSecret }}
{{- if and (not $secretName) $secretCreate }}
{{- $secretName = $defaultSecretName }}
{{- end }}
{{- if and $secretName .secretKey (not (hasKey $skip "OIDC_CLIENT_SECRET")) }}
- name: OIDC_CLIENT_SECRET
  valueFrom:
    secretKeyRef:
      name: {{ $secretName | quote }}
      key: {{ .secretKey | quote }}
{{- end }}
{{- end }}

{{- with $app.registry }}
{{- with .urls }}
{{- if not (hasKey $skip "REGISTRY_URLS") }}
- name: REGISTRY_URLS
  value: {{ join "," . | quote }}
{{- end }}
{{- end }}
{{- if and (hasKey . "cacheTtlSeconds") (not (hasKey $skip "REGISTRY_CACHE_TTL_SECONDS")) }}
- name: REGISTRY_CACHE_TTL_SECONDS
  value: {{ .cacheTtlSeconds | quote }}
{{- end }}
{{- if and (hasKey . "connectionTimeoutMs") (not (hasKey $skip "REGISTRY_CONNECTION_TIMEOUT_MS")) }}
- name: REGISTRY_CONNECTION_TIMEOUT_MS
  value: {{ .connectionTimeoutMs | quote }}
{{- end }}
{{- if and (hasKey . "readTimeoutMs") (not (hasKey $skip "REGISTRY_READ_TIMEOUT_MS")) }}
- name: REGISTRY_READ_TIMEOUT_MS
  value: {{ .readTimeoutMs | quote }}
{{- end }}
{{- if and (hasKey . "maxRetries") (not (hasKey $skip "REGISTRY_MAX_RETRIES")) }}
- name: REGISTRY_MAX_RETRIES
  value: {{ .maxRetries | quote }}
{{- end }}
{{- end }}

{{- with $app.vospace }}
{{- with .uri }}
{{- if not (hasKey $skip "VOSPACE_URI") }}
- name: VOSPACE_URI
  value: {{ . | quote }}
{{- end }}
{{- end }}
{{- end }}

{{- with .Values.env }}
{{ toYaml . }}
{{- end }}
{{- end -}}
