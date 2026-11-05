/** Site-wide floating WhatsApp contact — fixed bottom-left (the homepage's
 *  BackToTopButton already owns bottom-right) so visitors on any page can
 *  reach support/demo requests directly. +91 92053 13831, fixed number per
 *  product request — not sourced from env since it's a single support line,
 *  not environment-specific config. */
export function WhatsAppButton({ locale }: { locale: string }) {
  const hi = locale === 'hi';
  const message = hi
    ? 'नमस्ते, मुझे RajyaRank के बारे में सहायता चाहिए / डेमो देखना है।'
    : "Hi, I'd like some help with RajyaRank / to see a demo.";
  const href = `https://wa.me/919205313831?text=${encodeURIComponent(message)}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={hi ? 'सहायता व डेमो के लिए WhatsApp पर लिखें' : 'Chat on WhatsApp for help & demo'}
      title={hi ? 'सहायता व डेमो के लिए WhatsApp' : 'WhatsApp for help & demo'}
      // bottom-[86px] on mobile clears StudentShell's 70px fixed bottom nav
      // (h-[70px], md:hidden) plus a gap; desktop has no bottom nav so bottom-6 is fine.
      className="fixed bottom-[86px] left-4 z-40 grid h-14 w-14 place-items-center rounded-full bg-[#25D366] text-white shadow-[0_12px_28px_rgba(37,211,102,0.45)] transition-transform duration-300 hover:-translate-y-0.5 hover:bg-[#20bd5a] md:bottom-6 md:left-6 md:h-12 md:w-12"
    >
      <svg aria-hidden viewBox="0 0 32 32" width="28" height="28" fill="currentColor">
        <path d="M16.004 3C9.096 3 3.5 8.596 3.5 15.504c0 2.59.773 5.001 2.11 7.013L4 29l6.676-1.572a12.47 12.47 0 0 0 5.328 1.184h.005c6.907 0 12.503-5.596 12.503-12.504C28.512 9.2 22.916 3 16.004 3Zm0 22.86h-.004a10.33 10.33 0 0 1-5.267-1.44l-.378-.225-3.96.933.945-3.86-.246-.397a10.317 10.317 0 0 1-1.58-5.47c0-5.711 4.648-10.358 10.363-10.358 2.768 0 5.37 1.08 7.325 3.038a10.29 10.29 0 0 1 3.038 7.325c0 5.712-4.648 10.454-10.236 10.454Zm5.666-7.76c-.31-.155-1.832-.903-2.116-1.007-.284-.103-.49-.155-.696.156-.207.31-.8 1.006-.98 1.213-.18.207-.362.233-.671.078-.31-.155-1.307-.482-2.49-1.538-.92-.822-1.54-1.837-1.72-2.147-.18-.31-.02-.478.16-.634.156-.155.362-.414.543-.62.18-.207.233-.362.35-.568.116-.207.055-.388-.05-.543-.104-.155-.954-2.302-1.31-3.147-.33-.788-.666-.68-.916-.693-.233-.012-.5-.012-.767-.012-.267 0-.697.1-1.06.49-.362.388-1.384 1.355-1.384 3.303 0 1.947 1.42 3.827 1.616 4.093.197.267 2.698 4.12 6.542 5.608 3.17 1.198 3.17.8 3.741.75.572-.052 1.832-.75 2.09-1.47.258-.72.258-1.336.18-1.47-.078-.129-.284-.207-.594-.362Z" />
      </svg>
    </a>
  );
}
