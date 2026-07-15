import "package:flutter/material.dart";
import "package:flutter_test/flutter_test.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";

import "package:smartbiz_mobile/features/auth/presentation/login_page.dart";

void main() {
  testWidgets("renders login page", (tester) async {
    await tester.pumpWidget(
      const ProviderScope(
        child: MaterialApp(home: LoginPage()),
      ),
    );

    expect(find.text("SmartBiz Mobile"), findsOneWidget);
    expect(find.text("Sign in"), findsOneWidget);
  });
}
