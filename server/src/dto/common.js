/**
 * 通用请求校验中间件：消除各模块 dto 中重复的 validateBody/validateQuery 实现。
 * 各业务 dto 仅负责定义 Joi schema，校验中间件统一从这里导入。
 */

// 验证中间件生成器
export function validateBody(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      convert: true,
      abortEarly: false,
    });
    if (error) {
      return res
        .status(400)
        .json({ code: 400, message: '请求参数错误', errors: error.details });
    }
    // 覆盖为转换后的值（例如字符串数字转换为 number）
    req.body = value;
    next();
  };
}

// 查询参数验证中间件
export function validateQuery(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, {
      convert: true,
      abortEarly: false,
    });
    if (error) {
      return res
        .status(400)
        .json({ code: 400, message: '查询参数错误', errors: error.details });
    }
    req.query = value;
    next();
  };
}

// 保持向后兼容：壁纸 dto 历史上从此处导出 schema 时也带这两个工具
// 现已统一抽离到本文件，避免壁纸模块被留言等其它模块跨域依赖。
