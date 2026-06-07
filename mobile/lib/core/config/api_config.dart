class ApiConfig {
  const ApiConfig._();

  static const String _rawBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://34.31.162.75:8000/api/v1',
  );

  static String get baseUrl {
    final normalized = _rawBaseUrl.trim().replaceAll(RegExp(r'/+$'), '');
    if (normalized.endsWith('/api/v1')) {
      return normalized;
    }
    return '$normalized/api/v1';
  }
}
