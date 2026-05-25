"""
Pandoc Python filtresi: Sözdizimi renklendirme yardımcısı
Kod bloklarına ek metadata ve sınıf bilgileri ekler.
"""

from panflute import run_filter, CodeBlock


def add_code_metadata(elem, doc):
    """Kod bloklarına dil bilgisi ve satır numaralandırma metadata'sı ekler."""
    if isinstance(elem, CodeBlock):
        # Dil sınıfı yoksa 'text' olarak işaretle
        if not elem.classes:
            elem.classes.append("text")

        # Satır numaralandırma sınıfı ekle
        if "numberLines" not in elem.classes:
            elem.classes.append("numberLines")

        return elem


def main(doc=None):
    return run_filter(add_code_metadata, doc=doc)


if __name__ == "__main__":
    main()
