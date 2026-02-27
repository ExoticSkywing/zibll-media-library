import re

with open('/www/wwwroot/xingxy.manyuzo.com/wp-content/plugins/zibll-media-library/assets/js/media-library.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 这是我之前注入导致问题的代码模式块：
old_block_1 = """        // 修复 Bootstrap 多层 Modal 层级遮挡 Bug
        $('#zml-delete-modal').on('show.bs.modal', function() {
            var zIndex = 1100;
            $(this).css('z-index', zIndex);
            setTimeout(function() {
                $('.modal-backdrop').not('.modal-stack').css('z-index', zIndex - 1).addClass('modal-stack');
            }, 0);
        });

        // 显示弹窗
        $('#zml-delete-modal').modal('show');"""

new_block_1 = """        // 让二次确认弹窗强制位于顶层且不带第二层黑背景遮罩
        $('#zml-delete-modal').css({'z-index': 10505, 'background': 'rgba(0,0,0,0.5)'}).modal({ backdrop: false, show: true });"""

old_block_2 = """        // 修复 Bootstrap 多层 Modal 层级遮挡 Bug
        $('#zml-batch-delete-modal').on('show.bs.modal', function() {
            var zIndex = 1100;
            $(this).css('z-index', zIndex);
            setTimeout(function() {
                $('.modal-backdrop').not('.modal-stack').css('z-index', zIndex - 1).addClass('modal-stack');
            }, 0);
        });

        $('#zml-batch-delete-modal').modal('show');"""

new_block_2 = """        // 让批量删除弹窗强制位于顶层且不带第二层黑背景遮罩
        $('#zml-batch-delete-modal').css({'z-index': 10505, 'background': 'rgba(0,0,0,0.5)'}).modal({ backdrop: false, show: true });"""

content = content.replace(old_block_1, new_block_1)
content = content.replace(old_block_2, new_block_2)

# 为了防止HTML字符串自带的 z-index 也被覆盖或者干扰，我们确保 HTML 里不带影响层的错误设置
# 或者是我们在 css 里直接最高层级。

with open('/www/wwwroot/xingxy.manyuzo.com/wp-content/plugins/zibll-media-library/assets/js/media-library.js', 'w', encoding='utf-8') as f:
    f.write(content)
print("Modal z-index fix applied.")
