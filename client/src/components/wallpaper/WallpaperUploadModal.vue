<template>
	<div class="modal-overlay" @click="$emit('close')">
		<div class="modal-content" @click.stop>
			<div class="modal-header">
				<h3>上传壁纸</h3>
				<button @click="$emit('close')" class="close-btn">&times;</button>
			</div>

			<div class="modal-body">
				<form @submit.prevent="handleUpload">
					<!-- 分组选择 -->
					<div class="form-group">
						<label>选择分组：</label>
						<select v-model="selectedGroupId">
							<option value="">默认分组</option>
							<option v-for="group in groups" :key="group.id" :value="group.id">
								{{ group.name }}
							</option>
						</select>
					</div>

					<!-- 名称输入 -->
					<div class="form-group">
						<label for="wallpaper-name">名称：</label>
						<input type="text" id="wallpaper-name" v-model="wallpaperName" placeholder="请输入壁纸名称" />
					</div>

					<!-- 描述已移除 -->

					<!-- 文件选择 -->
					<div class="form-group">
						<label>选择图片：</label>
						<FileDropzone class="dropzone" accept="image/*" :multiple="false" @files-selected="handleFiles">
							<span v-if="selectedFiles.length === 0">
								点击选择图片文件<br>
								<small>最小分辨率：800x600，超过7680x4320会自动压缩；请保护文件大小 &lt;= 10MB</small>
							</span>
							<span v-else>已选择 <strong>{{ selectedFiles.length }}</strong> 个文件</span>
						</FileDropzone>
					</div>

					<!-- 文件预览 -->
					<FilePreviewList :items="selectedFiles" @remove="removeFile" />

					<!-- 错误提示 -->
					<div v-if="error" class="error-message">{{ error }}</div>

					<!-- 上传进度 -->
					<div v-if="uploading" class="upload-progress">
						<div class="progress-bar">
							<div class="progress-fill" :style="{ width: uploadProgress + '%' }"></div>
						</div>
						<p>上传中... {{ uploadProgress }}%</p>
					</div>

					<div class="modal-actions">
						<button type="button" @click="$emit('close')" class="btn btn-secondary">取消</button>
						<button type="submit" :disabled="selectedFiles.length === 0 || uploading" class="btn btn-primary">
							{{ uploading ? '上传中...' : '上传' }}
						</button>
					</div>
				</form>
			</div>
		</div>
	</div>
</template>

<script setup>
import { ref } from 'vue';
import { useWallpaper } from '@/composables/useWallpaper.js';
import { processImageFile } from '@/composables/useImageProcessing.js';
import FileDropzone from '@/components/wallpaper/upload/FileDropzone.vue';
import FilePreviewList from '@/components/wallpaper/upload/FilePreviewList.vue';

const props = defineProps({
	groups: { type: Array, default: () => [] }
});

const emit = defineEmits(['close', 'uploaded', 'open-bulk']);

const { uploadWallpaper } = useWallpaper();

const selectedGroupId = ref('');
const wallpaperName = ref('');
const selectedFiles = ref([]);
const uploading = ref(false);
const uploadProgress = ref(0);
const error = ref('');

const handleFiles = async (filesArray) => {
	const files = Array.from(filesArray || []);
	if (files.length === 0) return;

	const file = files[0];
	selectedFiles.value = [];
	error.value = '';
	wallpaperName.value = file.name.split('.').slice(0, -1).join('.');

	try {
		const item = await processImageFile(file, {
			minWidth: 800,
			minHeight: 600,
			maxWidth: 7680,
			maxHeight: 4320,
			maxSizeMB: 10
		});
		selectedFiles.value.push(item);
	} catch (err) {
		console.error('处理图片时出错:', err);
		error.value = err.message || '处理图片时出错，请重试';
	}
};

const removeFile = (index) => { selectedFiles.value.splice(index, 1); };

const openBulk = () => {
  // 先关闭当前上传对话框，再通知父组件打开批量上传
  emit('close');
  emit('open-bulk');
};

const handleUpload = async () => {
	if (selectedFiles.value.length === 0) return;
	uploading.value = true;
	uploadProgress.value = 0;
	error.value = '';
	try {
		const fileItem = selectedFiles.value[0];
		await uploadWallpaper(
			fileItem.file,
			selectedGroupId.value || null,
			wallpaperName.value,
			(progress) => { uploadProgress.value = progress; }
		);
		emit('uploaded');
	} catch (err) {
		error.value = err.message || '上传失败';
	} finally {
		uploading.value = false;
		uploadProgress.value = 0;
	}
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 8px;
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #eee;
}

.modal-header h3 {
  margin: 0;
  color: #333;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #666;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  color: #333;
}

.modal-body {
  padding: 20px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #333;
}

.form-group select,
.form-group input[type="text"] {
	width: 100%;
	padding: 10px 12px;
	border: 1px solid #e3e7ea;
	border-radius: 6px;
	background: #fff;
	box-shadow: inset 0 1px 0 rgba(0,0,0,0.02);
	font-size: 14px;
}

.dropzone {
	display: block;
	border: 2px dashed #d0d7de;
	background: linear-gradient(180deg, #fbfcfd, #ffffff);
	padding: 18px;
	border-radius: 8px;
	text-align: center;
	color: #55606a;
	cursor: pointer;
	transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.dropzone:hover { border-color: #9fb0c7; box-shadow: 0 6px 18px rgba(16,24,40,0.06); }
.dropzone small { display: block; color: #6c7a89; margin-top: 6px; }

.preview-wrap { margin-top: 12px; }
.preview-wrap img { max-width: 140px; border-radius: 6px; box-shadow: 0 6px 18px rgba(16,24,40,0.06); }



.error-message {
  background: #fee;
  color: #c33;
  padding: 10px;
  border-radius: 4px;
  margin-bottom: 20px;
}

.upload-progress {
  margin-bottom: 20px;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: #eee;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-fill {
  height: 100%;
  background: #007bff;
  transition: width 0.3s ease;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.3s ease;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: #007bff;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #0056b3;
}

.btn { box-shadow: 0 2px 6px rgba(16,24,40,0.06); }

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background: #545b62;
}
</style>