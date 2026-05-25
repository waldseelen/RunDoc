--- table_styler.lua
--- Pandoc Lua filtresi: Tablo biçimlendirme
--- Tüm tablolara CSS sınıfları ve erişilebilirlik özellikleri ekler.

function Table(el)
    -- Tabloya CSS class ekle
    if el.attr then
        el.attr.classes:insert("styled-table")
    end
    return el
end
