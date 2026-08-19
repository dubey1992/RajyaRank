import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/auth/auth_repository.dart';
import 'support_models.dart';

final supportTicketsProvider = FutureProvider.autoDispose<List<TicketView>>((
  ref,
) async {
  final api = ref.watch(apiClientProvider);
  final response = await api.dio.get('/student/support-tickets');
  return (response.data['data'] as List)
      .cast<Map<String, dynamic>>()
      .map(TicketView.fromJson)
      .toList();
});

class SupportRepository {
  SupportRepository(this._ref);
  final Ref _ref;

  Future<void> createTicket({
    required TicketCategory category,
    required String subject,
    required String bodyText,
  }) async {
    final api = _ref.read(apiClientProvider);
    await api.dio.post(
      '/student/support-tickets',
      data: {
        'category': category.wireValue,
        'subject': subject,
        'bodyText': bodyText,
      },
    );
  }

  Future<void> reply(String ticketId, String bodyText) async {
    final api = _ref.read(apiClientProvider);
    await api.dio.post(
      '/student/support-tickets/$ticketId/replies',
      data: {'bodyText': bodyText},
    );
  }
}

final supportRepositoryProvider = Provider((ref) => SupportRepository(ref));
