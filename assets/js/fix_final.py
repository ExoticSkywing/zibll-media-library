import re

with open('/www/wwwroot/xingxy.manyuzo.com/wp-content/plugins/zibll-media-library/assets/js/media-library.js', 'r', encoding='utf-8') as f:
    content = f.read()

# ===============================
# 替换单文件删除 showDeleteConfirm 函数 (由于之前替换逻辑混乱，我们用正则直接截取函数头和尾)
# ===============================
new_single = """    function showDeleteConfirm(attachmentId, mediaItem, fileName) {
        if (confirm("您正在删除文件（" + fileName + "）\\n\\n删除后无法恢复，确定要删除吗？")) {
            deleteMedia(attachmentId, mediaItem, function () {
                if (typeof Notyf !== 'undefined') new Notyf().success(zmlAjax.deleteSuccess || '文件删除成功');
            }, function () {
                if (typeof Notyf !== 'undefined') new Notyf().error(zmlAjax.deleteFailed || '文件删除失败');
            });
        }
    }"""

content = re.sub(r'    function showDeleteConfirm\(attachmentId, mediaItem, fileName\) \{.*?(?=\n    function deleteMedia)', new_single + "\n\n", content, flags=re.DOTALL)


# ===============================
# 替换批量删除 showBatchDeleteConfirm 函数
# ===============================
new_batch = """    function showBatchDeleteConfirm() {
        if (!confirm("您已选中 " + selectedMediaIds.length + " 个文件\\n\\n删除后无法恢复，确认要全部删除吗？")) {
            return;
        }

        const btn = $('.zml-batch-delete-btn');
        btn.prop('disabled', true).text('删除中...');

        $.ajax({
            url: zmlAjax.ajaxurl,
            type: 'POST',
            data: {
                action: 'zml_delete_media_batch',
                nonce: zmlAjax.nonce,
                attachment_ids: selectedMediaIds
            },
            success: function (response) {
                if (response.success) {
                    if (typeof Notyf !== 'undefined') new Notyf().success(response.data.message || '批量删除成功');

                    // 从 DOM 中移除选中的项
                    $('.zml-media-item.zml-selected').fadeOut(400, function () {
                        $(this).remove();
                        const container = getListContainer(currentMediaType);
                        if (container.find('.zml-media-item').length === 0) {
                            showEmptyState(container, currentMediaType);
                        }
                    });
                    // 退出编辑模式
                    exitEditMode();
                } else {
                    btn.prop('disabled', false).html('<i class="fa fa-trash-o"></i>删除选定');
                    if (typeof Notyf !== 'undefined') new Notyf().error(response.data.message || zmlAjax.deleteFailed);
                }
            },
            error: function () {
                btn.prop('disabled', false).html('<i class="fa fa-trash-o"></i>删除选定');
                if (typeof Notyf !== 'undefined') new Notyf().error(zmlAjax.deleteFailed);
            }
        });
    }"""

content = re.sub(r'    function showBatchDeleteConfirm\(\) \{.*?\}\n\}\n', new_batch + "\n", content, flags=re.DOTALL)

with open('/www/wwwroot/xingxy.manyuzo.com/wp-content/plugins/zibll-media-library/assets/js/media-library.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("Final JS Confirm fix applied.")
