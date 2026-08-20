import 'dart:async';

import 'package:flutter/material.dart';

/// Live-ticking days/hours/minutes countdown — mirrors
/// apps/web/components/ExamCountdown.tsx (30s refresh there; this ticks
/// every second since a Flutter Timer is cheap and it reads as more alive).
class ExamCountdown extends StatefulWidget {
  const ExamCountdown({super.key, required this.examDate});

  final DateTime examDate;

  @override
  State<ExamCountdown> createState() => _ExamCountdownState();
}

class _ExamCountdownState extends State<ExamCountdown> {
  late Timer _timer;
  Duration _remaining = Duration.zero;

  @override
  void initState() {
    super.initState();
    _tick();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) => _tick());
  }

  void _tick() {
    final remaining = widget.examDate.difference(DateTime.now());
    if (mounted) setState(() => _remaining = remaining.isNegative ? Duration.zero : remaining);
  }

  @override
  void dispose() {
    _timer.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final days = _remaining.inDays;
    final hours = _remaining.inHours % 24;
    final minutes = _remaining.inMinutes % 60;

    return Row(
      children: [
        _Unit(value: days, label: 'days'),
        const _Colon(),
        _Unit(value: hours, label: 'hrs'),
        const _Colon(),
        _Unit(value: minutes, label: 'min'),
      ],
    );
  }
}

class _Unit extends StatelessWidget {
  const _Unit({required this.value, required this.label});

  final int value;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(
          value.toString().padLeft(2, '0'),
          style: const TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.w800,
            fontSize: 24,
            fontFeatures: [FontFeature.tabularFigures()],
          ),
        ),
        Text(label, style: const TextStyle(color: Colors.white60, fontSize: 10)),
      ],
    );
  }
}

class _Colon extends StatelessWidget {
  const _Colon();

  @override
  Widget build(BuildContext context) {
    return const Padding(
      padding: EdgeInsets.symmetric(horizontal: 10),
      child: Text(':', style: TextStyle(color: Colors.white38, fontSize: 22, fontWeight: FontWeight.w700)),
    );
  }
}
