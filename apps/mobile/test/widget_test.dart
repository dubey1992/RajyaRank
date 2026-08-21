import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:rajyarank_student/main.dart';

void main() {
  testWidgets('app boots without crashing when signed out', (tester) async {
    await tester.pumpWidget(const ProviderScope(child: RajyaRankApp()));
    await tester.pump();
    expect(find.byType(MaterialApp), findsOneWidget);
  });
}
