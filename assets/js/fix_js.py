import re

with open('/www/wwwroot/xingxy.manyuzo.com/wp-content/plugins/zibll-media-library/assets/js/media-library.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 替换 1: 函数 getExtColor 和 createListItem
old_create = """    function createListItem(file) {
        const iconClass = getFileIcon(file.mime_type);
        const ext = file.name.split('.').pop().toLowerCase();

        let iconHtml = '';
        if (file.thumbnail) {
            iconHtml = '<img src="' + file.thumbnail + '" alt="' + file.name + '">';
        } else {
            iconHtml = '<i class="fa ' + iconClass + ' zml-file-icon"></i>';
        }

        const authorBadge = file.author_id != zmlAjax.currentUserId && file.author ? '<span class="zml-author-badge">' + file.author + '</span>' : '';

        const downloadBtn = '<button class="zml-action-btn zml-download-btn" data-url="' + file.url + '" data-name="' + file.name + '" title="下载"><i class="fa fa-download"></i></button>';
        const deleteBtn = file.can_delete ? '<button class="zml-action-btn zml-delete-btn" data-id="' + file.id + '" title="删除"><i class="fa fa-trash-o"></i></button>' : '';
        const checkboxHtml = file.can_delete ? '<div class="zml-item-checkbox"></div>' : '';

        const itemHtml = '<div class="zml-media-item" data-id="' + file.id + '">' + checkboxHtml + '<div class="zml-list-box"><div class="zml-list-icon-box">' + iconHtml + '</div><div class="zml-list-content"><div class="zml-media-name" title="' + file.name + '">' + file.name + '</div>' + authorBadge + '<div class="zml-list-meta"><span>' + ext + '</span><span>日期: ' + file.date + '</span><span>' + file.size + '</span></div></div><div class="zml-media-actions">' + downloadBtn + deleteBtn + '</div></div></div>';

        return $(itemHtml);
    }"""

new_create = """    function getExtColor(ext) {
        const colors = {
            'zip': '#9b59b6', 'rar': '#8e44ad', '7z': '#8e44ad',
            'pdf': '#e74c3c', 'doc': '#2980b9', 'docx': '#2980b9',
            'xls': '#27ae60', 'xlsx': '#27ae60',
            'ppt': '#e67e22', 'pptx': '#e67e22',
            'mp3': '#1abc9c', 'wav': '#16a085',
            'txt': '#7f8c8d'
        };
        return colors[ext] || '#bdc3c7';
    }

    function createListItem(file) {
        const iconClass = getFileIcon(file.mime_type);
        const ext = file.name.split('.').pop().toLowerCase();
        const extColor = getExtColor(ext);

        let iconHtml = '';
        if (file.thumbnail) {
            iconHtml = '<img src="' + file.thumbnail + '" alt="' + file.name + '">';
        } else {
            iconHtml = '<i class="fa ' + iconClass + ' zml-file-icon"></i>';
        }

        const authorBadge = file.author_id != zmlAjax.currentUserId && file.author ? '<span class="zml-author-badge">' + file.author + '</span>' : '';

        const downloadBtn = '<button class="zml-action-btn zml-download-btn" data-url="' + file.url + '" data-name="' + file.name + '" title="下载"><i class="fa fa-download"></i></button>';
        const deleteBtn = file.can_delete ? '<button class="zml-action-btn zml-delete-btn" data-id="' + file.id + '" title="删除"><i class="fa fa-trash-o"></i></button>' : '';
        const checkboxHtml = file.can_delete ? '<div class="zml-item-checkbox"></div>' : '';

        const extBadge = '<span class="zml-ext-badge" style="background-color: ' + extColor + ';">' + ext + '</span>';

        const itemHtml = '<div class="zml-media-item" data-id="' + file.id + '">' + checkboxHtml + '<div class="zml-list-box"><div class="zml-list-icon-box">' + iconHtml + '</div><div class="zml-list-content"><div class="zml-media-name" title="' + file.name + '">' + file.name + '</div>' + authorBadge + '<div class="zml-list-meta">' + extBadge + '<span>日期: ' + file.date + '</span><span>' + file.size + '</span></div></div><div class="zml-media-actions">' + downloadBtn + deleteBtn + '</div></div></div>';

        return $(itemHtml);
    }"""

content = content.replace(old_create, new_create)

# 替换 2: showBatchDeleteConfirm 中的 modal
old_batch = r"        \$\('body'\)\.append\(modalHtml\);\n        \$\('#zml-batch-delete-modal'\)\.modal\('show'\);"
new_batch = """        $('body').append(modalHtml);
        
        $('#zml-batch-delete-modal').on('show.bs.modal', function() {
            var zIndex = 1100;
            $(this).css('z-index', zIndex);
            setTimeout(function() {
                $('.modal-backdrop').not('.modal-stack').css('z-index', zIndex - 1).addClass('modal-stack');
            }, 0);
        });

        $('#zml-batch-delete-modal').modal('show');"""

content = re.sub(old_batch, new_batch, content)

with open('/www/wwwroot/xingxy.manyuzo.com/wp-content/plugins/zibll-media-library/assets/js/media-library.js', 'w', encoding='utf-8') as f:
    f.write(content)
print("Fix applied successfully.")
